import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // Use 127.0.0.1 (IPv4) instead of localhost which resolves to ::1 (IPv6)
        // on Windows, causing ECONNRESET / ECONNREFUSED errors in the Vite proxy.
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.error('[Vite Proxy Error]', err.message);
          });
        }
      }
    }
  }
})
