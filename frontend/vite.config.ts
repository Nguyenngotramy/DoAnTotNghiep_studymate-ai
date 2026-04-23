import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    port: 5173,
    proxy: {
      // REST API → Spring Boot backend
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // WebSocket STOMP + SockJS
      '/ws': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
        rewriteWsOrigin: true,
        secure: false,
      },
      // Static uploads từ backend
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // OAuth2 Google flow — Spring Security xử lý TẠI BACKEND
      // CHỈ proxy /login/oauth2 (bắt đầu flow Google)
      // KHÔNG proxy /oauth2/callback (React Router xử lý trang này)
      '/login/oauth2': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          react:  ['react', 'react-dom', 'react-router-dom'],
          query:  ['@tanstack/react-query'],
          ui:     ['lucide-react', 'clsx', 'react-hot-toast'],
          stomp:  ['@stomp/stompjs', 'sockjs-client'],
        },
      },
    },
  },
})