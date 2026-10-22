import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, type StyleProp, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';

import type { Appearance, Locale, SigningEmbedCallbacks } from '@sajn/embed-js';

import { newNonce, parseMessage, toScript } from './bridge';
import { buildHostPage, CALLBACKS } from './host-page';

const DEFAULT_HOST = 'https://app.sajn.se';

export type SigningEmbedProps = SigningEmbedCallbacks & {
    /** Calls your backend, which creates an embed session and returns its `clientSecret`. Called again whenever a session ends. */
    fetchClientSecret: () => Promise<string>;
    /**
     * The origin the frame sees as its parent, such as `https://app.example.com`. It must match one of your
     * organization's embed domains and the session's `origins`. Nothing is loaded from it.
     */
    origin: string;
    /** Defaults to https://app.sajn.se. */
    host?: string;
    appearance?: Appearance;
    locale?: Locale;
    /** The frame's accessible name. */
    title?: string;
    /** Opens eID pages and the BankID app link. Defaults to Linking.openURL, which leaves your app for the browser or the eID app. */
    openUrl?: (url: string) => void;
    /** Logs the page's console, errors and frame messages to the React Native console. */
    debug?: boolean;
    style?: StyleProp<ViewStyle>;
};

const originOf = (url: string) => {
    try {
        return new URL(url).origin;
    } catch {
        return null;
    }
};

export const SigningEmbed = ({ fetchClientSecret, origin, host = DEFAULT_HOST, appearance, locale, title, openUrl, debug = false, style, ...callbacks }: SigningEmbedProps) => {
    const webView = useRef<WebView>(null);
    const [inlineHeight, setInlineHeight] = useState<number | null>(null);

    // Read through a ref, so a new inline callback each render never reloads the page.
    const latest = useRef({ fetchClientSecret, callbacks, openUrl });
    latest.current = { fetchClientSecret, callbacks, openUrl };

    // Appearance and locale change through update() below; only these rebuild the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // A new page per build, with a new nonce, so replies to an old page's requests go nowhere.
    const [pageKey, setPageKey] = useState(0);
    const { html, nonce } = useMemo(() => {
        const pageNonce = newNonce();
        return { html: buildHostPage({ host, appearance, locale, title, debug, nonce: pageNonce }), nonce: pageNonce };
        // pageKey rebuilds the page with a fresh nonce after something replaced it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [host, title, debug, pageKey]);

    const appearanceKey = JSON.stringify([appearance ?? null, locale ?? null]);
    useEffect(() => {
        webView.current?.injectJavaScript(`window.__sajnEmbed && window.__sajnEmbed.update(${toScript({ appearance, locale })}); true;`);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appearanceKey]);

    const open = useCallback((url: string) => {
        const handler = latest.current.openUrl ?? ((target: string) => void Linking.openURL(target));
        handler(url);
    }, []);

    // The page a secret reply belongs to. A reply for an older page is dropped, never handed to whatever is loaded now.
    const currentNonce = useRef(nonce);
    const loadStarts = useRef({ nonce, count: 0 });
    useEffect(() => {
        currentNonce.current = nonce;
    }, [nonce]);

    // The first load is the page itself. A later top-level load means something replaced it: outstanding replies are
    // cancelled, and the page comes back with a new nonce.
    const onLoadStart = useCallback(() => {
        if (loadStarts.current.nonce !== nonce) loadStarts.current = { nonce, count: 0 };
        loadStarts.current.count += 1;
        if (loadStarts.current.count === 1) return;
        currentNonce.current = '';
        setPageKey((key) => key + 1);
    }, [nonce]);

    const onMessage = useCallback((event: WebViewMessageEvent) => {
        const message = parseMessage(event.nativeEvent.data, nonce);
        if (!message) return;

        if (message.kind === 'open-url') return open(message.url);
        if (message.kind === 'log') return console.log(`[sajn ${message.level}]`, message.message);

        if (message.kind === 'secret') {
            const resolve = (secret: string | null, error: string | null) => {
                if (currentNonce.current !== nonce) return;
                // Checked where the script runs: a reply queued before a navigation lands in the new page, which only
                // gets the secret if it is on your origin.
                webView.current?.injectJavaScript(`if (location.origin === ${toScript(originOf(origin))} && window.__sajnResolve) window.__sajnResolve(${toScript(nonce)}, ${toScript(message.id)}, ${toScript(secret)}, ${toScript(error)}); true;`);
            };
            latest.current.fetchClientSecret().then((secret) => resolve(secret, null), (error: unknown) => resolve(null, error instanceof Error ? error.message : String(error)));
            return;
        }

        if (message.name === 'onResize' && typeof message.data === 'number') setInlineHeight(message.data);
        const callback = latest.current.callbacks[message.name as (typeof CALLBACKS)[number]] as ((data: unknown) => void) | undefined;
        callback?.(message.data);
    }, [open, nonce, origin]);

    const allowedOrigins = useMemo(() => new Set([originOf(origin), originOf(host)]), [origin, host]);

    // Frames the sajn page loads itself (payments, the PDF viewer) stay inside. Only a top-level navigation away from
    // your page and sajn, or a link no web view can load (bankid://, tel:), leaves for the browser or the app it names.
    const onShouldStartLoadWithRequest = useCallback((request: ShouldStartLoadRequest) => {
        const isWebUrl = /^(https?|about|data|blob):/i.test(request.url);
        // iOS reports frame loads with isTopFrame false; Android reports top-frame loads only, always as true.
        if (isWebUrl && (request.isTopFrame === false || allowedOrigins.has(originOf(request.url)) || request.url.startsWith('about:'))) return true;
        open(request.url);
        return false;
    }, [allowedOrigins, open]);

    const isInline = appearance?.mode === 'inline';

    return (
        <WebView
            ref={webView}
            source={{ html, baseUrl: origin }}
            originWhitelist={['*']}
            onMessage={onMessage}
            onLoadStart={onLoadStart}
            onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
            setSupportMultipleWindows={false}
            scrollEnabled={!isInline}
            style={[isInline && inlineHeight !== null ? { height: inlineHeight } : { flex: 1 }, style]}
        />
    );
};
