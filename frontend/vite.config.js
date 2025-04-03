import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        // 👈 Only API requests get proxied
        target: "http://127.0.0.1:7000",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});
