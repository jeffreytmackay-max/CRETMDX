import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// SINGLEFILE=1 inlines everything into one self-contained index.html (openable
// offline / without a server). Otherwise a normal static build (for GitHub Pages).
const singleFile = process.env.SINGLEFILE === '1';

export default defineConfig({
  // Relative base so assets resolve under any sub-path (e.g. /CRETMDX/ on Pages)
  // or when opened directly as a local file.
  base: './',
  plugins: [react(), tailwindcss(), ...(singleFile ? [viteSingleFile()] : [])],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:4000' },
  },
});
