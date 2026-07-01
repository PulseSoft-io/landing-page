import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), tailwindcss()],
  build: {
    // The client build (`vite build`) writes to dist/. The SSR build
    // (`vite build --ssr src/entry-server.jsx`) must write somewhere
    // else, or it will overwrite the client build's output.
    outDir: isSsrBuild ? 'dist-ssr' : 'dist',
  },
}));
