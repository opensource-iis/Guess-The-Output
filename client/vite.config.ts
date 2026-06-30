import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// The Express + Socket.IO server runs on :3000. In dev, Vite serves the UI on :5173 and
// proxies the realtime + API traffic to the game server. In prod, `vite build` -> dist/ which
// the Express server serves directly.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/socket.io': { target: 'http://localhost:3000', ws: true },
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
