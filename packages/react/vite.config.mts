import react from '@vitejs/plugin-react';
import { copyFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        lib: {
            entry: './src/index.ts',
            name: '@sajn/embed-react',
            formats: ['es', 'cjs'],
            fileName: (format) => (format === 'es' ? 'index.mjs' : 'index.cjs'),
        },
        rollupOptions: {
            external: ['react', 'react/jsx-runtime', 'react-dom', '@sajn/embed-js'],
        },
    },
    plugins: [
        react(),
        dts({
            include: ['src'],
            exclude: ['src/**/*.test.tsx'],
            // One declaration file, written to package.json `types`: node16 ESM can't resolve a per-file emit's extensionless imports.
            rollupTypes: true,
            afterBuild() {
                copyFileSync('dist/index.d.cts', 'dist/index.d.mts');
            },
        }),
    ],
});