import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// During `vite dev`: proxies /api and /socket.io to BACKEND_URL (default localhost:3000)
// During `vite build`: VITE_API_URL & VITE_SOCKET_URL get baked into the bundle.
//   Leave them empty for same-origin deploys (docker prod with nginx).
//   Set them to your backend URL for cross-origin deploys (Vercel + Render).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL ?? 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: process.env.BACKEND_URL ?? 'http://localhost:3000',
        ws: true,
      },
    },
  },
});
