import vue from '@vitejs/plugin-vue';
import { copyFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        lib: {
            entry: './src/index.ts',
            name: '@sajn/embed-vue',
            formats: ['es', 'cjs'],
            fileName: (format) => (format === 'es' ? 'index.mjs' : 'index.js'),
        },
        rollupOptions: {
            external: ['vue'],
            output: {
                globals: {
                    vue: 'Vue',
                },
            },
        },
    },
    plugins: [
        vue(),
        dts({
            include: ['src'],
            afterBuild() {
                copyFileSync('dist/index.d.ts', 'dist/index.d.mts');
            },
        }),
    ],
});
