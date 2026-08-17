import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('elkjs')) {
              return 'vendor-elk';
            }
            if (id.includes('jspdf') || id.includes('html-to-image')) {
              return 'vendor-export';
            }
            if (id.includes('roughjs')) {
              return 'vendor-rough';
            }
            if (id.includes('@xyflow')) {
              return 'vendor-xyflow';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('dagre')) {
              return 'vendor-dagre';
            }
          }
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true,
    },
  },
});
