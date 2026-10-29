// Mirrors sajn-app lib/universal/embed/embed-protocol.ts. Protocol 2 only grows: new fields and events are additive.
export const PROTOCOL_VERSION = '2.1';
export const MESSAGE_SOURCE = 'sajn-embed';

export type Locale = 'sv' | 'en' | 'no' | 'da' | 'fi' | 'de' | 'is' | 'es' | 'fr' | 'it';

export type Appearance = {
    colors?: {
        background?: string;
        foreground?: string;
        muted?: string;
        mutedForeground?: string;
        primary?: string;
        primaryForeground?: string;
        border?: string;
        destructive?: string;
    };
    /** Corner radius in pixels, 0–24. */
    radius?: number;
    fontFamily?: 'default' | 'system' | 'serif';
    colorScheme?: 'light' | 'dark' | 'system';
    /** `inline` grows the frame to fit its content. `fixed` scrolls inside the frame and fills the container. */
    mode?: 'inline' | 'fixed';
    /** Show the bar with the document name. Defaults to true. Without it, the menu for download, delegation and rejection sits in the top corner. */
    header?: boolean;
    /** Show a hint to scroll down until the sign section is in view. Defaults to true. Only in `fixed` mode. */
    scrollIndicator?: boolean;
    /** Show the document ID under the sign button. Defaults to true. */
    documentId?: boolean;
};

// The app's EMBED_ERROR_CODES, plus `client_secret_failed`, which only the SDK raises.
export type EmbedErrorCode =
    | 'session_not_found'
    | 'session_expired'
    | 'session_revoked'
    | 'origin_not_allowed'
    | 'not_entitled'
    | 'document_unavailable'
    | 'invalid_appearance'
    | 'unsupported_sdk'
    | 'bootstrap_timeout'
    | 'client_secret_failed';

export type PartyStatus = 'pending' | 'signed' | 'rejected';

export type EmbedState = {
    revision: number;
    documentId: string;
    partyId: string;
    externalId: string | null;
    documentStatus: string;
    partyStatus: PartyStatus;
    fieldsSubmitted: boolean;
    rejectionReasonGiven: boolean;
};

export type EmbedIds = { documentId: string; partyId: string; externalId: string | null };

/** `loadMs`: from the frame's navigation to its first painted page. */
export type EmbedReady = EmbedIds & { loadMs: number };

export type EmbedEvent =
    | { type: 'embed.hello'; data: { protocol: string } }
    | { type: 'embed.ready'; data: EmbedReady }
    | { type: 'embed.resize'; data: { height: number } }
    | { type: 'embed.scroll_into_view'; data: { top: number; height: number } }
    | { type: 'embed.state'; data: EmbedState }
    | { type: 'embed.error'; data: { code: EmbedErrorCode; message: string } }
    | { type: 'embed.session_expired'; data: Record<string, never> }
    | { type: 'embed.fields_submitted'; data: EmbedIds }
    | { type: 'fields.progress'; data: EmbedIds & { remaining: number; total: number } }
    | { type: 'fields.changed'; data: EmbedIds & { values: Record<string, string | string[]> } }
    | { type: 'embed.open_url'; data: { url: string } }
    | { type: 'document.party.verified'; data: EmbedIds }
    | { type: 'document.party.signed'; data: EmbedIds }
    | { type: 'document.party.rejected'; data: EmbedIds & { reasonGiven: boolean } };

export type EmbedEnvelope = EmbedEvent & { source: typeof MESSAGE_SOURCE; v: 2; seq: number; sessionId: string };

export const isEnvelope = (value: unknown): value is EmbedEnvelope => {
    if (!value || typeof value !== 'object') return false;

    const message = value as Record<string, unknown>;
    return message.source === MESSAGE_SOURCE
        && message.v === 2
        && typeof message.type === 'string'
        && typeof message.seq === 'number'
        && typeof message.sessionId === 'string'
        && typeof message.data === 'object'
        && message.data !== null;
};

// The secret is `<sessionId>_secret_<random>`, so one value from the customer's backend is enough to build the frame.
export const sessionIdFromSecret = (clientSecret: string) => {
    const match = /^(emb_[0-9a-f]{32})_secret_[A-Za-z0-9_-]+$/.exec(clientSecret);
    return match ? match[1] : null;
};
