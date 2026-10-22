import { CALLBACKS, type HostMessage } from './host-page';

export const newNonce = () => {
    const bytes = new Uint8Array(16);
    // Hermes has no Web Crypto unless the app polyfills it; Math.random is the fallback, and frames can't read the nonce either way.
    const webCrypto = (globalThis as { crypto?: { getRandomValues?: (array: Uint8Array) => Uint8Array } }).crypto;
    if (webCrypto?.getRandomValues) webCrypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

// JSON is valid JavaScript except for these two line terminators, which would end the injected string.
export const toScript = (value: unknown) => JSON.stringify(value).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

export const parseMessage = (raw: string, nonce: string): HostMessage | null => {
    let value: unknown;
    try {
        value = JSON.parse(raw);
    } catch {
        return null;
    }
    if (!value || typeof value !== 'object') return null;

    const message = value as Record<string, unknown>;
    if (message.nonce !== nonce) return null;

    if (message.kind === 'secret' && Number.isSafeInteger(message.id)) return { kind: 'secret', id: message.id as number };
    if (message.kind === 'open-url' && typeof message.url === 'string') return { kind: 'open-url', url: message.url };
    if (message.kind === 'event' && (CALLBACKS as readonly unknown[]).includes(message.name)) return { kind: 'event', name: message.name as string, data: message.data };
    if (message.kind === 'log' && typeof message.message === 'string') return { kind: 'log', level: String(message.level), message: message.message };
    return null;
};
