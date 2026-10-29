import { createApp, h, ref, type App } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import SigningEmbed from './SigningEmbed.vue';

const HOST = 'https://app.sajn.se';
const SESSION = `emb_${'a'.repeat(32)}`;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('<SigningEmbed> (Vue)', () => {
    let container: HTMLElement;
    let app: App | null = null;

    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'], shouldAdvanceTime: true });
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        app?.unmount();
        app = null;
        container.remove();
        vi.useRealTimers();
    });

    it('asks the frame for its state through the exposed requestState', async () => {
        const embed = ref<InstanceType<typeof SigningEmbed> | null>(null);
        app = createApp({ render: () => h(SigningEmbed, { ref: embed, fetchClientSecret: async () => `${SESSION}_secret_x` }) });
        app.mount(container);
        await flush();

        const frame = container.querySelector('iframe') as HTMLIFrameElement;
        const post = vi.spyOn(frame.contentWindow as Window, 'postMessage');
        frame.dispatchEvent(new Event('load'));
        window.dispatchEvent(new MessageEvent('message', {
            data: { source: 'sajn-embed', v: 2, type: 'embed.hello', seq: 1, sessionId: SESSION, data: { protocol: '2.1' } },
            origin: HOST,
            source: frame.contentWindow,
        }));

        embed.value?.requestState();
        expect(post).toHaveBeenCalledWith(expect.objectContaining({ type: 'embed.state' }), HOST);
    });

    it('passes bootstrapTimeoutMs to the core', () => {
        const onError = vi.fn();
        app = createApp({ render: () => h(SigningEmbed, { fetchClientSecret: () => new Promise<string>(() => {}), bootstrapTimeoutMs: 1000, onError }) });
        app.mount(container);

        vi.advanceTimersByTime(1100);
        expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'bootstrap_timeout' }));
    });
});
