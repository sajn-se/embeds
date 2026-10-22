import { describe, expect, it } from 'vitest';

import { parseMessage, toScript } from './bridge';

const NONCE = 'n0nce';

// The bridge is how a frame inside the web view could reach the app, so it accepts only the page's own, well-formed messages.
describe('React Native bridge', () => {
    it('accepts the page script\'s own messages', () => {
        expect(parseMessage(JSON.stringify({ nonce: NONCE, kind: 'secret', id: 3 }), NONCE)).toEqual({ kind: 'secret', id: 3 });
        expect(parseMessage(JSON.stringify({ nonce: NONCE, kind: 'event', name: 'onSigned', data: { documentId: 'd' } }), NONCE)).toMatchObject({ name: 'onSigned' });
    });

    it.each([
        ['no nonce', { kind: 'event', name: 'onSigned' }],
        ['a wrong nonce', { nonce: 'guess', kind: 'event', name: 'onSigned' }],
        ['an id that is code', { nonce: NONCE, kind: 'secret', id: '0, null, null); globalThis.injected = true; //' }],
        ['an unknown callback', { nonce: NONCE, kind: 'event', name: 'constructor' }],
        ['a url that is not a string', { nonce: NONCE, kind: 'open-url', url: { toString: 'x' } }],
    ])('drops a message with %s', (_case, message) => {
        expect(parseMessage(JSON.stringify(message), NONCE)).toBeNull();
    });

    it('serializes injected values as inert data', () => {
        expect(toScript('a b")</script>')).toBe('"a\\u2028b\\")</script>"');
    });
});
