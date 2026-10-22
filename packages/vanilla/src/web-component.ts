import type { Appearance, Locale } from './protocol';
import { createSigningEmbed, type SigningEmbed } from './signing-embed';

// The JS API's callbacks, as DOM events: `ready`, `signed`, `rejected`, `fields-submitted`, `fields-progress`, `fields-changed`, `verified`,
// `state-change`, `resize`, `session-expired` and `embed-error`, each with the callback's argument in `detail`.
// `embed-error`, not `error`: the DOM's own error event would be mistaken for it.
const EVENTS = {
    onReady: 'ready',
    onSigned: 'signed',
    onRejected: 'rejected',
    onFieldsSubmitted: 'fields-submitted',
    onFieldsProgress: 'fields-progress',
    onFieldsChanged: 'fields-changed',
    onVerified: 'verified',
    onStateChange: 'state-change',
    onResize: 'resize',
    onSessionExpired: 'session-expired',
    onError: 'embed-error',
} as const;

const ATTRIBUTES = ['client-secret-url', 'host', 'locale', 'appearance', 'fallback-height', 'frame-title'] as const;

// Server rendering imports this module too, where HTMLElement doesn't exist.
const ElementBase = (typeof HTMLElement === 'undefined' ? class {} : HTMLElement) as typeof HTMLElement;

const parseAppearance = (value: string | null): Appearance | undefined => {
    if (!value) return undefined;
    try {
        return JSON.parse(value) as Appearance;
    } catch {
        return undefined;
    }
};

class SajnEmbedElement extends ElementBase {
    static observedAttributes = [...ATTRIBUTES];

    /** Set this, or the `client-secret-url` attribute, to give the element its client secrets. */
    fetchClientSecret?: () => Promise<string>;

    protected defaultTitle = 'Signera dokument';
    private instance: SigningEmbed | null = null;

    connectedCallback() {
        this.mount();
    }

    disconnectedCallback() {
        this.instance?.destroy();
        this.instance = null;
    }

    attributeChangedCallback(name: string) {
        if (!this.instance) return;

        // Appearance and locale change live; anything else needs a new session.
        if (name === 'appearance' || name === 'locale') {
            this.instance.update({ appearance: parseAppearance(this.getAttribute('appearance')), locale: (this.getAttribute('locale') as Locale) || undefined });
            return;
        }

        this.instance.destroy();
        this.mount();
    }

    private readonly fetchFromUrl = async () => {
        const url = this.getAttribute('client-secret-url');
        if (!url) throw new Error('Set client-secret-url or the fetchClientSecret property on the element');

        const response = await fetch(url, { method: 'POST', credentials: 'same-origin' });
        const json = (await response.json()) as { clientSecret?: string };
        if (!response.ok || !json.clientSecret) throw new Error(`${url} returned no clientSecret`);
        return json.clientSecret;
    };

    private mount() {
        if (!this.isConnected) return;
        if (!this.style.display) this.style.display = 'block';

        const callbacks = Object.fromEntries(
            Object.entries(EVENTS).map(([callback, event]) => [callback, (detail?: unknown) => this.dispatchEvent(new CustomEvent(event, { detail }))]),
        );

        this.instance = createSigningEmbed({
            ...callbacks,
            container: this,
            host: this.getAttribute('host') || undefined,
            locale: (this.getAttribute('locale') as Locale) || undefined,
            appearance: parseAppearance(this.getAttribute('appearance')),
            fallbackHeight: this.getAttribute('fallback-height') || undefined,
            title: this.getAttribute('frame-title') || this.defaultTitle,
            fetchClientSecret: () => (this.fetchClientSecret ?? this.fetchFromUrl)(),
        });
    }
}

/** `<sajn-signing-embed client-secret-url="/api/sajn-session">` */
export class SajnSigningEmbedElement extends SajnEmbedElement {}

/** `<sajn-viewing-embed client-secret-url="/api/sajn-session">`, for a `viewing` session. */
export class SajnViewingEmbedElement extends SajnEmbedElement {
    protected defaultTitle = 'Visa dokument';
}

export const defineSajnElements = () => {
    if (typeof customElements === 'undefined') return;
    if (!customElements.get('sajn-signing-embed')) customElements.define('sajn-signing-embed', SajnSigningEmbedElement);
    if (!customElements.get('sajn-viewing-embed')) customElements.define('sajn-viewing-embed', SajnViewingEmbedElement);
};

// A plain <script> tag gets the elements without calling anything.
defineSajnElements();
