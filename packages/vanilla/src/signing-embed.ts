import {
    MESSAGE_SOURCE,
    PROTOCOL_VERSION,
    isEnvelope,
    sessionIdFromSecret,
    type Appearance,
    type EmbedErrorCode,
    type EmbedEvent,
    type EmbedIds,
    type EmbedReady,
    type EmbedState,
    type Locale,
} from './protocol';

declare const __SDK_VERSION__: string;

const DEFAULT_HOST = 'https://app.sajn.se';
const INIT_INTERVAL_MS = 500;
const DEFAULT_BOOTSTRAP_TIMEOUT_MS = 10_000;
// A session that keeps expiring right after it starts points at a broken backend; stop rather than loop.
const MAX_RESTARTS_PER_MINUTE = 3;

export type SigningEmbedError = { code: EmbedErrorCode; message: string };

export type SigningEmbedCallbacks = {
    onReady?: (ready: EmbedReady) => void;
    onSigned?: (ids: EmbedIds) => void;
    onRejected?: (ids: EmbedIds & { reasonGiven: boolean }) => void;
    onFieldsSubmitted?: (ids: EmbedIds) => void;
    /** Required fields still empty, out of all the party's fields. Fires as the party fills them in. */
    onFieldsProgress?: (progress: EmbedIds & { remaining: number; total: number }) => void;
    /** What the party has typed, by field key. Values verified with an eID, such as a personnummer, are never sent. */
    onFieldsChanged?: (fields: EmbedIds & { values: Record<string, string | string[]> }) => void;
    onVerified?: (ids: EmbedIds) => void;
    onStateChange?: (state: EmbedState) => void;
    onResize?: (height: number) => void;
    onSessionExpired?: () => void;
    onError?: (error: SigningEmbedError) => void;
};

export type SigningEmbedOptions = SigningEmbedCallbacks & {
    /** The element the frame fills. In `fixed` mode give it a height. */
    container: HTMLElement;
    /** Calls your backend, which calls `POST /api/v1/embed-sessions` and returns its `clientSecret`. Called again whenever a session ends. */
    fetchClientSecret: () => Promise<string>;
    /** Defaults to https://app.sajn.se. */
    host?: string;
    /** Cosmetic overrides on top of the session's appearance. */
    appearance?: Appearance;
    locale?: Locale;
    /** The frame's accessible name. */
    title?: string;
    /** Frame height in `fixed` mode when the container has no height of its own. Defaults to 600px. */
    fallbackHeight?: string;
    bootstrapTimeoutMs?: number;
    /**
     * Opens the eID pages and the BankID app link yourself. Set it where the frame can't open a window, such as a
     * native app's web view; without it, the frame opens them on its own.
     */
    openUrl?: (url: string) => void;
};

export type SigningEmbed = {
    update: (changes: { appearance?: Appearance; locale?: Locale }) => void;
    /** Ask the frame for a fresh `embed.state`. */
    requestState: () => void;
    destroy: () => void;
};

// Colors merge per key, so an update that sets one color keeps the rest.
const mergeAppearance = (base: Appearance | undefined, changes: Appearance): Appearance => ({
    ...base,
    ...changes,
    ...(base?.colors || changes.colors ? { colors: { ...base?.colors, ...changes.colors } } : {}),
});

export const createSigningEmbed = (options: SigningEmbedOptions): SigningEmbed => {
    const host = options.host ?? DEFAULT_HOST;
    const hostOrigin = new URL(host).origin;
    const bootstrapTimeoutMs = options.bootstrapTimeoutMs ?? DEFAULT_BOOTSTRAP_TIMEOUT_MS;

    let appearance = options.appearance;
    let locale = options.locale;
    let iframe: HTMLIFrameElement | null = null;
    let sessionId: string | null = null;
    let lastSeq = 0;
    let isConnected = false;
    let isDestroyed = false;
    let initTimer: ReturnType<typeof setInterval> | null = null;
    let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
    const restarts: number[] = [];

    const fail = (error: SigningEmbedError) => options.onError?.(error);

    const post = (type: string, data: unknown) => {
        iframe?.contentWindow?.postMessage({ source: MESSAGE_SOURCE, v: 2, type, data }, hostOrigin);
    };

    const stopBootstrap = () => {
        if (initTimer) clearInterval(initTimer);
        if (timeoutTimer) clearTimeout(timeoutTimer);
        initTimer = null;
        timeoutTimer = null;
    };

    const isInline = () => appearance?.mode === 'inline';

    const sizeFrame = () => {
        if (!iframe) return;
        iframe.style.colorScheme = appearance?.colorScheme === 'dark' ? 'dark' : appearance?.colorScheme === 'system' ? 'light dark' : 'light';
        // A fixed frame fills its container; only a container with no height of its own gets the fallback, so a short one never clips the signing tray.
        if (!isInline()) {
            iframe.style.height = options.container.clientHeight > 0 ? '100%' : (options.fallbackHeight ?? '600px');
        }
    };

    const sendCommands = () => {
        if (appearance) post('appearance.update', appearance);
        if (locale) post('locale.update', { locale });
    };

    const handleEvent = (event: EmbedEvent) => {
        switch (event.type) {
            case 'embed.hello':
                isConnected = true;
                stopBootstrap();
                sendCommands();
                return;
            case 'embed.ready':
                return options.onReady?.(event.data);
            case 'embed.resize':
                // Only an inline frame reports its height, whether the host or the session asked for inline.
                if (iframe) {
                    iframe.style.height = `${event.data.height}px`;
                    iframe.style.minHeight = '0';
                }
                return options.onResize?.(event.data.height);
            case 'embed.scroll_into_view': {
                if (!iframe) return;
                const top = iframe.getBoundingClientRect().top + event.data.top;
                const isInView = top >= 0 && top + Math.min(event.data.height ?? 0, window.innerHeight) <= window.innerHeight;
                if (!isInView) window.scrollTo({ top: window.scrollY + top - 24, behavior: 'smooth' });
                return;
            }
            case 'embed.state':
                return options.onStateChange?.(event.data);
            case 'embed.open_url':
                return options.openUrl?.(event.data.url);
            case 'embed.fields_submitted':
                return options.onFieldsSubmitted?.(event.data);
            case 'fields.progress':
                return options.onFieldsProgress?.(event.data);
            case 'fields.changed':
                return options.onFieldsChanged?.(event.data);
            case 'document.party.verified':
                return options.onVerified?.(event.data);
            case 'document.party.signed':
                return options.onSigned?.(event.data);
            case 'document.party.rejected':
                return options.onRejected?.(event.data);
            case 'embed.error':
                stopBootstrap();
                return fail(event.data);
            case 'embed.session_expired':
                options.onSessionExpired?.();
                void restart();
                return;
            default:
                // Newer frames may send events this SDK doesn't know; they are ignored, never an error.
                return;
        }
    };

    const onMessage = (event: MessageEvent) => {
        if (!iframe || event.source !== iframe.contentWindow || event.origin !== hostOrigin) return;
        if (!isEnvelope(event.data) || event.data.sessionId !== sessionId) return;
        // A reloaded frame document starts its sequence over, and always opens with hello.
        if (event.data.type !== 'embed.hello' && event.data.seq <= lastSeq) return;

        lastSeq = event.data.seq;
        handleEvent(event.data);
    };

    const mount = async () => {
        let clientSecret: string;

        try {
            clientSecret = await options.fetchClientSecret();
        } catch (error) {
            fail({ code: 'client_secret_failed', message: error instanceof Error ? error.message : String(error) });
            return;
        }

        if (isDestroyed) return;

        const id = sessionIdFromSecret(clientSecret);
        if (!id) {
            fail({ code: 'client_secret_failed', message: 'fetchClientSecret returned something that is not an embed session client secret' });
            return;
        }

        sessionId = id;
        lastSeq = 0;
        isConnected = false;

        const frame = document.createElement('iframe');
        frame.src = new URL(`/embed/v2/${id}`, host).toString();
        frame.title = options.title ?? 'Signera dokument';
        frame.allow = 'publickey-credentials-get; clipboard-write; storage-access; payment';
        frame.referrerPolicy = 'strict-origin-when-cross-origin';
        frame.style.border = '0';
        frame.style.width = '100%';
        frame.style.display = 'block';

        const sendInit = () => post('embed.init', {
            clientSecret,
            protocol: PROTOCOL_VERSION,
            sdkVersion: __SDK_VERSION__,
            capabilities: options.openUrl ? ['resize', 'state', 'open-url'] : ['resize', 'state'],
        });

        // Every frame document needs its own handshake, including one the frame reloaded by itself.
        frame.addEventListener('load', () => {
            if (isDestroyed) return;
            isConnected = false;
            lastSeq = 0;
            stopBootstrap();
            sendInit();
            initTimer = setInterval(sendInit, INIT_INTERVAL_MS);
            timeoutTimer = setTimeout(() => {
                stopBootstrap();
                if (!isConnected) fail({ code: 'bootstrap_timeout', message: 'The sajn frame did not answer. Check the session origins and your organization\'s embed domains.' });
            }, bootstrapTimeoutMs);
        });

        iframe?.remove();
        iframe = frame;
        sizeFrame();
        options.container.appendChild(frame);
    };

    const restart = async () => {
        const now = Date.now();
        while (restarts.length && now - restarts[0] > 60_000) restarts.shift();
        if (restarts.length >= MAX_RESTARTS_PER_MINUTE) {
            fail({ code: 'session_expired', message: 'Sessions keep expiring right after they start.' });
            return;
        }

        restarts.push(now);
        stopBootstrap();
        await mount();
    };

    // The connection to sajn opens while your backend creates the session, not after.
    if (!document.querySelector(`link[rel="preconnect"][href="${hostOrigin}"]`)) {
        const preconnect = document.createElement('link');
        preconnect.rel = 'preconnect';
        preconnect.href = hostOrigin;
        document.head.appendChild(preconnect);
    }

    window.addEventListener('message', onMessage);
    void mount();

    return {
        update: (changes) => {
            if (changes.appearance) appearance = mergeAppearance(appearance, changes.appearance);
            if (changes.locale) locale = changes.locale;
            sizeFrame();
            if (isConnected) sendCommands();
        },
        requestState: () => {
            if (isConnected) post('embed.state', {});
        },
        destroy: () => {
            isDestroyed = true;
            stopBootstrap();
            window.removeEventListener('message', onMessage);
            iframe?.remove();
            iframe = null;
        },
    };
};

// The session decides what the frame shows; this name reads right for a `viewing` session.
export const createViewingEmbed = (options: SigningEmbedOptions): SigningEmbed => createSigningEmbed({ title: 'Visa dokument', ...options });
