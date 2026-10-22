import { defineConfig } from 'vitest/config';

export default defineConfig({
    define: { __SDK_VERSION__: JSON.stringify('test') },
    test: { environment: 'jsdom', include: ['packages/*/src/**/*.test.ts'] },
});
