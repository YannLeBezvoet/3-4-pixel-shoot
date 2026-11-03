import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    // The client reads the palette and, later, themes/ and locales/ from the repository root.
    fs: { allow: ['../..'] },
  },
  build: { target: 'es2023' },
});
