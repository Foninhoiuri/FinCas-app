import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Alvo do proxy de desenvolvimento. Configure VITE_API_TARGET no .env do
// frontend para apontar para outro host (ex.: http://IP-DO-SERVIDOR:3001).
// O padrão é localhost, que funciona em qualquer máquina sem configuração.
const API_TARGET = process.env.VITE_API_TARGET || 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
      '/api-docs': {
        target: API_TARGET,
        changeOrigin: true,
      },
      '/uploads': {
        target: API_TARGET,
        changeOrigin: true,
      },
      '/ws': {
        target: API_TARGET,
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
