import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    react(),
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
    }),
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
      '/api': { target: 'https://monogram-backend-dxv4.onrender.com', changeOrigin: true },
      '/auth': { target: 'https://monogram-backend-dxv4.onrender.com', changeOrigin: true },
      '/users': { target: 'https://monogram-backend-dxv4.onrender.com', changeOrigin: true },
      '/chats': { target: 'https://monogram-backend-dxv4.onrender.com', changeOrigin: true },
      '/messages': { target: 'https://monogram-backend-dxv4.onrender.com', changeOrigin: true },
      '/uploads': { target: 'https://monogram-backend-dxv4.onrender.com', changeOrigin: true },
      '/admin': { target: 'https://monogram-backend-dxv4.onrender.com', changeOrigin: true },
      '/settings': { target: 'https://monogram-backend-dxv4.onrender.com', changeOrigin: true },
      '/premium': { target: 'https://monogram-backend-dxv4.onrender.com', changeOrigin: true },
      '/payment': { target: 'https://monogram-backend-dxv4.onrender.com', changeOrigin: true },
      '/stickers': { target: 'https://monogram-backend-dxv4.onrender.com', changeOrigin: true },
      '/search': { target: 'https://monogram-backend-dxv4.onrender.com', changeOrigin: true },
      '/e2ee': { target: 'https://monogram-backend-dxv4.onrender.com', changeOrigin: true },
      '/bots': { target: 'https://monogram-backend-dxv4.onrender.com', changeOrigin: true },
      '/drafts': { target: 'https://monogram-backend-dxv4.onrender.com', changeOrigin: true },
      '/archive': { target: 'https://monogram-backend-dxv4.onrender.com', changeOrigin: true },
      '/folders': { target: 'https://monogram-backend-dxv4.onrender.com', changeOrigin: true },
      '/saved': { target: 'https://monogram-backend-dxv4.onrender.com', changeOrigin: true },
      '/polls': { target: 'https://monogram-backend-dxv4.onrender.com', changeOrigin: true },
      '/ws': { target: 'wss://monogram-backend-dxv4.onrender.com', ws: true }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'chat': ['./src/components/ChatWindow.tsx', './src/components/Sidebar.tsx'],
        }
      }
    }
  },
  preview: {
    port: 5173,
    host: true
  }
})
