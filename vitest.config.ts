import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [vue()],
    define: { __SDK_VERSION__: JSON.stringify('test') },
    // The wrappers' tests run against the core's source, not its build.
    resolve: { alias: { '@sajn/embed-js': fileURLToPath(new URL('./packages/vanilla/src/index.ts', import.meta.url)) } },
    test: { environment: 'jsdom', include: ['packages/*/src/**/*.test.{ts,tsx}'] },
});
