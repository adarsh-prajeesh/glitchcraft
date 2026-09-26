import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/attendance': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/library': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/leave': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/voter': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  }
});
