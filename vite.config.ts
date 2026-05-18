import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
        // Split eagerly-loaded vendor libs into stable chunks.
        // Lazy route deps (recharts, xlsx, dnd-kit, react-markdown, framer-motion)
        // intentionally stay in their route chunks — manual-chunking them would
        // pull them into the eager waterfall.
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('/firebase/') || id.includes('/@firebase/')) return 'firebase-vendor'
          if (id.includes('/react-router')) return 'router-vendor'
          if (id.includes('/@tanstack/')) return 'query-vendor'
          if (id.match(/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/)) return 'react-vendor'
          return undefined
        },
      }
    }
  }
})
