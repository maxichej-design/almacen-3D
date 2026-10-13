import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Servidor de desarrollo con recarga automática (HMR).
// host: true permite abrirlo también desde otro equipo/celular de la red local.
export default defineConfig({
  plugins: [react()],
  build: {
    // Three.js es grande; el aviso por defecto (500 kB) no aporta en este proyecto.
    chunkSizeWarningLimit: 1500,
  },
  server: {
    host: true,
    port: 5173,
  },
});
