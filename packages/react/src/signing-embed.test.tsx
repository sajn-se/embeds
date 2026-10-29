import { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SigningEmbed, type SigningEmbedHandle } from './signing-embed';

const HOST = 'https://app.sajn.se';
const SESSION = `emb_${'a'.repeat(32)}`;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('<SigningEmbed>', () => {
    let container: HTMLElement;
    let root: Root;

    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'], shouldAdvanceTime: true });
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.useRealTimers();
    });

    it('asks the frame for its state through the ref', async () => {
        const ref = createRef<SigningEmbedHandle>();
        await act(async () => {
            root.render(<SigningEmbed ref={ref} fetchClientSecret={async () => `${SESSION}_secret_x`} />);
            await flush();
        });

        const frame = container.querySelector('iframe') as HTMLIFrameElement;
        const post = vi.spyOn(frame.contentWindow as Window, 'postMessage');
        frame.dispatchEvent(new Event('load'));
        window.dispatchEvent(new MessageEvent('message', {
            data: { source: 'sajn-embed', v: 2, type: 'embed.hello', seq: 1, sessionId: SESSION, data: { protocol: '2.1' } },
            origin: HOST,
            source: frame.contentWindow,
        }));

        ref.current?.requestState();
        expect(post).toHaveBeenCalledWith(expect.objectContaining({ type: 'embed.state' }), HOST);
    });

    it('passes bootstrapTimeoutMs to the core', async () => {
        const onError = vi.fn();
        await act(async () => {
            root.render(<SigningEmbed fetchClientSecret={() => new Promise<string>(() => {})} bootstrapTimeoutMs={1000} onError={onError} />);
        });

        vi.advanceTimersByTime(1100);
        expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'bootstrap_timeout' }));
    });
});
