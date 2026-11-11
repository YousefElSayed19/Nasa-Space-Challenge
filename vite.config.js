import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// A relative base works on GitHub Pages under any repository name (GDD 12.3).
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { chunkSizeWarningLimit: 1200 },
});
