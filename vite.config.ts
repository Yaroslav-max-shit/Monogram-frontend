import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'cache-assets',
      configureServer(server) {
        server.middlewares.use('/assets/', (_req, res, next) => {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          next();
        });
      },
    },
  ],
  server: {
    port: 5173,
    host: 'localhost',
    strictPort: false,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
      overlay: false,
      timeout: 120000
    },
    proxy: {
      '/api': { target: process.env.VITE_API_URL || 'http://localhost:8000', changeOrigin: true },
      '/auth': { target: process.env.VITE_API_URL || 'http://localhost:8000', changeOrigin: true },
      '/users': { target: process.env.VITE_API_URL || 'http://localhost:8000', changeOrigin: true },
      '/chats': { target: process.env.VITE_API_URL || 'http://localhost:8000', changeOrigin: true },
      '/messages': { target: process.env.VITE_API_URL || 'http://localhost:8000', changeOrigin: true },
      '/uploads': { target: process.env.VITE_API_URL || 'http://localhost:8000', changeOrigin: true },
      '/admin': { target: process.env.VITE_API_URL || 'http://localhost:8000', changeOrigin: true },
      '/settings': { target: process.env.VITE_API_URL || 'http://localhost:8000', changeOrigin: true },
      '/premium': { target: process.env.VITE_API_URL || 'http://localhost:8000', changeOrigin: true },
      '/payment': { target: process.env.VITE_API_URL || 'http://localhost:8000', changeOrigin: true },
      '/stickers': { target: process.env.VITE_API_URL || 'http://localhost:8000', changeOrigin: true },
      '/search': { target: process.env.VITE_API_URL || 'http://localhost:8000', changeOrigin: true },
      '/e2ee': { target: process.env.VITE_API_URL || 'http://localhost:8000', changeOrigin: true },
      '/bots': { target: process.env.VITE_API_URL || 'http://localhost:8000', changeOrigin: true },
      '/drafts': { target: process.env.VITE_API_URL || 'http://localhost:8000', changeOrigin: true },
      '/archive': { target: process.env.VITE_API_URL || 'http://localhost:8000', changeOrigin: true },
      '/folders': { target: process.env.VITE_API_URL || 'http://localhost:8000', changeOrigin: true },
      '/saved': { target: process.env.VITE_API_URL || 'http://localhost:8000', changeOrigin: true },
      '/polls': { target: process.env.VITE_API_URL || 'http://localhost:8000', changeOrigin: true },
      '/ws': { target: (process.env.VITE_API_URL || 'http://localhost:8000').replace(/^http/, 'ws'), ws: true }
    }
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      }
    }
  },
  preview: {
    port: 5173,
    host: 'localhost'
  }
})
