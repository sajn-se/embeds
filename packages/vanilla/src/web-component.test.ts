import { afterEach, describe, expect, it, vi } from 'vitest';

import './web-component';

const SESSION = `emb_${'a'.repeat(32)}`;

// The element is the no-build integration: one tag, a URL on the customer's server, and DOM events.
describe('<sajn-signing-embed>', () => {
    afterEach(() => {
        document.body.innerHTML = '';
        vi.unstubAllGlobals();
    });

    it('gets its secret from client-secret-url and frames that session', async () => {
        const fetchMock = vi.fn(async () => new Response(JSON.stringify({ clientSecret: `${SESSION}_secret_x` })));
        vi.stubGlobal('fetch', fetchMock);

        document.body.innerHTML = '<sajn-signing-embed client-secret-url="/api/sajn-session"></sajn-signing-embed>';
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(fetchMock).toHaveBeenCalledWith('/api/sajn-session', expect.objectContaining({ method: 'POST' }));
        expect(document.querySelector('sajn-signing-embed iframe')?.getAttribute('src')).toBe(`https://app.sajn.se/embed/v2/${SESSION}`);
    });

    it('reports a failed secret as an embed-error event', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })));
        const onError = vi.fn();

        const element = document.createElement('sajn-viewing-embed');
        element.setAttribute('client-secret-url', '/api/sajn-session');
        element.addEventListener('embed-error', (event) => onError((event as CustomEvent).detail));
        document.body.appendChild(element);
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'client_secret_failed' }));
    });
});
