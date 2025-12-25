import { copyFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        lib: {
            entry: './src/index.ts',
            name: 'sajn',
            formats: ['es', 'cjs', 'umd'],
            fileName: (format) => {
                if (format === 'es') return 'index.mjs';
                if (format === 'cjs') return 'index.js';
                return 'index.umd.js';
            },
        },
    },
    plugins: [
        dts({
            include: ['src'],
            afterBuild() {
                copyFileSync('dist/index.d.ts', 'dist/index.d.mts');
            },
        }),
    ],
});
