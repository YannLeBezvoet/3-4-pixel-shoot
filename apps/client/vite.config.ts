import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { contentPlugin } from './vite/content-plugin';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig({
  plugins: [contentPlugin({ root: repoRoot })],
  oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
  server: {
    // The client imports the palette from the repository root.
    fs: { allow: [repoRoot] },
  },
  build: { target: 'es2023' },
});
