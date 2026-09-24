import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // ESSENTIEL pour Electron
  server: {
    port: 5173,
    // Important pour Electron
    strictPort: true,
    host: 'localhost',
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Optimisations pour Electron
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  // Résoudre les problèmes de compatibilité
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});