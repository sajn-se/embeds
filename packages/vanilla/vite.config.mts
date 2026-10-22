import { copyFileSync, readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
    define: {
        __SDK_VERSION__: JSON.stringify(version),
    },
    build: {
        lib: {
            entry: './src/index.ts',
            name: 'sajn',
            formats: ['es', 'cjs', 'umd'],
            fileName: (format) => {
                if (format === 'es') return 'index.mjs';
                if (format === 'cjs') return 'index.cjs';
                return 'index.umd.js';
            },
        },
    },
    plugins: [
        dts({
            include: ['src'],
            // One declaration file, written to package.json `types`: node16 ESM can't resolve a per-file emit's extensionless imports.
            rollupTypes: true,
            exclude: ['src/**/*.test.ts'],
            afterBuild() {
                copyFileSync('dist/index.d.cts', 'dist/index.d.mts');
            },
        }),
    ],
});
