import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSigningEmbed, type SigningEmbed } from './signing-embed';

const HOST = 'https://app.sajn.se';
const SESSION_A = `emb_${'a'.repeat(32)}`;
const SESSION_B = `emb_${'b'.repeat(32)}`;
const secretFor = (sessionId: string) => `${sessionId}_secret_xyz`;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const frameOf = (container: HTMLElement) => container.querySelector('iframe') as HTMLIFrameElement;

const fromFrame = (frame: HTMLIFrameElement, message: Record<string, unknown>, origin = HOST) =>
    window.dispatchEvent(new MessageEvent('message', { data: { source: 'sajn-embed', v: 2, ...message }, origin, source: frame.contentWindow }));

// The host half of protocol 2: what an integrator's page accepts from the frame, and what it sends back.
describe('createSigningEmbed', () => {
    let container: HTMLElement;
    let embed: SigningEmbed | null = null;

    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'], shouldAdvanceTime: true });
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        embed?.destroy();
        container.remove();
        vi.useRealTimers();
    });

    const mount = async (overrides: Partial<Parameters<typeof createSigningEmbed>[0]> = {}) => {
        embed = createSigningEmbed({ container, fetchClientSecret: async () => secretFor(SESSION_A), ...overrides });
        await flush();
        return frameOf(container);
    };

    it('frames the session named by the secret and keeps sending init until the frame says hello', async () => {
        const frame = await mount();
        expect(frame.src).toBe(`${HOST}/embed/v2/${SESSION_A}`);

        const post = vi.spyOn(frame.contentWindow as Window, 'postMessage');
        frame.dispatchEvent(new Event('load'));
        vi.advanceTimersByTime(1100);
        expect(post.mock.calls.filter(([message]) => message.type === 'embed.init').length).toBeGreaterThanOrEqual(3);
        expect(post.mock.calls[0]).toEqual([expect.objectContaining({ type: 'embed.init', data: expect.objectContaining({ clientSecret: secretFor(SESSION_A), protocol: '2.1' }) }), HOST]);

        fromFrame(frame, { type: 'embed.hello', seq: 1, sessionId: SESSION_A, data: { protocol: '2.0' } });
        post.mockClear();
        vi.advanceTimersByTime(2000);
        expect(post.mock.calls.filter(([message]) => message.type === 'embed.init')).toHaveLength(0);
    });

    it('ignores messages from another origin, another window, another session, or out of order', async () => {
        const onSigned = vi.fn();
        const frame = await mount({ onSigned });
        const ids = { documentId: 'doc', partyId: 'party', externalId: null };

        fromFrame(frame, { type: 'document.party.signed', seq: 1, sessionId: SESSION_A, data: ids }, 'https://evil.example.com');
        window.dispatchEvent(new MessageEvent('message', { data: { source: 'sajn-embed', v: 2, type: 'document.party.signed', seq: 1, sessionId: SESSION_A, data: ids }, origin: HOST, source: window }));
        fromFrame(frame, { type: 'document.party.signed', seq: 1, sessionId: SESSION_B, data: ids });
        expect(onSigned).not.toHaveBeenCalled();

        fromFrame(frame, { type: 'document.party.signed', seq: 2, sessionId: SESSION_A, data: ids });
        fromFrame(frame, { type: 'document.party.signed', seq: 2, sessionId: SESSION_A, data: ids });
        fromFrame(frame, { type: 'document.party.signed', seq: 1, sessionId: SESSION_A, data: ids });
        expect(onSigned).toHaveBeenCalledTimes(1);
        expect(onSigned).toHaveBeenCalledWith(ids);
    });

    it('handshakes again and accepts the restarted sequence when the frame reloads itself', async () => {
        const onSigned = vi.fn();
        const frame = await mount({ onSigned, appearance: { colors: { primary: '#0f766e' } } });
        const post = vi.spyOn(frame.contentWindow as Window, 'postMessage');
        const ids = { documentId: 'doc', partyId: 'party', externalId: null };

        frame.dispatchEvent(new Event('load'));
        fromFrame(frame, { type: 'embed.hello', seq: 1, sessionId: SESSION_A, data: { protocol: '2.0' } });
        fromFrame(frame, { type: 'embed.state', seq: 7, sessionId: SESSION_A, data: {} });

        post.mockClear();
        frame.dispatchEvent(new Event('load'));
        expect(post.mock.calls.some(([message]) => message.type === 'embed.init')).toBe(true);

        fromFrame(frame, { type: 'embed.hello', seq: 1, sessionId: SESSION_A, data: { protocol: '2.0' } });
        fromFrame(frame, { type: 'document.party.signed', seq: 2, sessionId: SESSION_A, data: ids });

        expect(onSigned).toHaveBeenCalledWith(ids);
        expect(post.mock.calls.filter(([message]) => message.type === 'appearance.update')).toHaveLength(1);
    });

    it('keeps the other colors when an update changes one', async () => {
        const frame = await mount({ appearance: { colors: { background: '#000000', foreground: '#ffffff' } } });
        frame.dispatchEvent(new Event('load'));
        fromFrame(frame, { type: 'embed.hello', seq: 1, sessionId: SESSION_A, data: { protocol: '2.0' } });
        const post = vi.spyOn(frame.contentWindow as Window, 'postMessage');

        embed?.update({ appearance: { colors: { primary: '#0f766e' } } });

        expect(post).toHaveBeenCalledWith(expect.objectContaining({
            type: 'appearance.update',
            data: { colors: { background: '#000000', foreground: '#ffffff', primary: '#0f766e' } },
        }), HOST);
    });

    it('tells the frame it opens links itself, and hands it the eID links', async () => {
        const openUrl = vi.fn();
        const frame = await mount({ openUrl });
        const post = vi.spyOn(frame.contentWindow as Window, 'postMessage');

        frame.dispatchEvent(new Event('load'));
        expect(post.mock.calls[0][0]).toMatchObject({ type: 'embed.init', data: { capabilities: expect.arrayContaining(['open-url']) } });

        fromFrame(frame, { type: 'embed.hello', seq: 1, sessionId: SESSION_A, data: { protocol: '2.0' } });
        fromFrame(frame, { type: 'embed.open_url', seq: 2, sessionId: SESSION_A, data: { url: 'https://app.sajn.se/embed/v2/handoff/emb_ho_x' } });
        expect(openUrl).toHaveBeenCalledWith('https://app.sajn.se/embed/v2/handoff/emb_ho_x');
    });

    it('fetches a new session and reframes it when the frame says the session ended', async () => {
        const secrets = [secretFor(SESSION_A), secretFor(SESSION_B)];
        const fetchClientSecret = vi.fn(async () => secrets.shift() as string);
        const onSessionExpired = vi.fn();
        const frame = await mount({ fetchClientSecret, onSessionExpired });

        fromFrame(frame, { type: 'embed.session_expired', seq: 1, sessionId: SESSION_A, data: {} });
        await flush();

        expect(onSessionExpired).toHaveBeenCalledTimes(1);
        expect(fetchClientSecret).toHaveBeenCalledTimes(2);
        expect(frameOf(container).src).toBe(`${HOST}/embed/v2/${SESSION_B}`);
        expect(container.querySelectorAll('iframe')).toHaveLength(1);
    });

    it('reports a frame that never answers instead of leaving a blank box', async () => {
        const onError = vi.fn();
        const frame = await mount({ onError, bootstrapTimeoutMs: 1000 });

        frame.dispatchEvent(new Event('load'));
        vi.advanceTimersByTime(1100);

        expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'bootstrap_timeout' }));
    });

    it('rejects a backend that returns something other than a client secret', async () => {
        const onError = vi.fn();
        await mount({ onError, fetchClientSecret: async () => 'sk_live_not_a_secret' });

        expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'client_secret_failed' }));
        expect(container.querySelector('iframe')).toBeNull();
    });
});
