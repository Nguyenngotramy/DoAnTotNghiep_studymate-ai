import path from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, path.resolve(__dirname, '..'), '')
  const aiAgentDevUrl = rootEnv.AI_AGENT_DEV_URL || 'http://localhost:3000'

  return {
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
      port: 5174,
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
        // Keep the service key in the Vite server, never in browser code.
        '/ai-agent': {
          target: aiAgentDevUrl,
          changeOrigin: true,
          headers: {
            'X-AI-Service-Key': rootEnv.AI_AGENT_SERVICE_KEY || '',
          },
          rewrite: (requestPath) => requestPath.replace(/^\/ai-agent/, ''),
        },
        '/ws': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          ws: true,
          rewriteWsOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
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
    },
  }
})
