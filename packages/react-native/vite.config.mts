import { copyFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        lib: {
            entry: './src/index.ts',
            formats: ['es', 'cjs'],
            fileName: (format) => (format === 'es' ? 'index.mjs' : 'index.cjs'),
        },
        rollupOptions: {
            external: ['react', 'react/jsx-runtime', 'react-native', 'react-native-webview'],
        },
    },
    plugins: [
        dts({
            include: ['src'],
            exclude: ['src/**/*.test.ts'],
            // One declaration file, written to package.json `types`: node16 ESM can't resolve a per-file emit's extensionless imports.
            rollupTypes: true,
            bundledPackages: ['@sajn/embed-js'],
            afterBuild() {
                copyFileSync('dist/index.d.cts', 'dist/index.d.mts');
            },
        }),
    ],
});
