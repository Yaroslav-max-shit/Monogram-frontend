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
    host: true,
    strictPort: false,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
      overlay: false,
      timeout: 120000
    },
    proxy: {
      '/api': { target: 'https://f1w6ggb2-8000.euw.devtunnels.ms', changeOrigin: true },
      '/auth': { target: 'https://f1w6ggb2-8000.euw.devtunnels.ms', changeOrigin: true },
      '/users': { target: 'https://f1w6ggb2-8000.euw.devtunnels.ms', changeOrigin: true },
      '/chats': { target: 'https://f1w6ggb2-8000.euw.devtunnels.ms', changeOrigin: true },
      '/messages': { target: 'https://f1w6ggb2-8000.euw.devtunnels.ms', changeOrigin: true },
      '/uploads': { target: 'https://f1w6ggb2-8000.euw.devtunnels.ms', changeOrigin: true },
      '/admin': { target: 'https://f1w6ggb2-8000.euw.devtunnels.ms', changeOrigin: true },
      '/settings': { target: 'https://f1w6ggb2-8000.euw.devtunnels.ms', changeOrigin: true },
      '/premium': { target: 'https://f1w6ggb2-8000.euw.devtunnels.ms', changeOrigin: true },
      '/payment': { target: 'https://f1w6ggb2-8000.euw.devtunnels.ms', changeOrigin: true },
      '/stickers': { target: 'https://f1w6ggb2-8000.euw.devtunnels.ms', changeOrigin: true },
      '/search': { target: 'https://f1w6ggb2-8000.euw.devtunnels.ms', changeOrigin: true },
      '/e2ee': { target: 'https://f1w6ggb2-8000.euw.devtunnels.ms', changeOrigin: true },
      '/bots': { target: 'https://f1w6ggb2-8000.euw.devtunnels.ms', changeOrigin: true },
      '/drafts': { target: 'https://f1w6ggb2-8000.euw.devtunnels.ms', changeOrigin: true },
      '/archive': { target: 'https://f1w6ggb2-8000.euw.devtunnels.ms', changeOrigin: true },
      '/folders': { target: 'https://f1w6ggb2-8000.euw.devtunnels.ms', changeOrigin: true },
      '/saved': { target: 'https://f1w6ggb2-8000.euw.devtunnels.ms', changeOrigin: true },
      '/polls': { target: 'https://f1w6ggb2-8000.euw.devtunnels.ms', changeOrigin: true },
      '/ws': { target: 'wss://f1w6ggb2-8000.euw.devtunnels.ms', ws: true }
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
    host: true
  }
})
