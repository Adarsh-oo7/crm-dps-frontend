import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  build: {
    // Source maps only in development (omit in prod to reduce bundle size)
    sourcemap: false,
    // Chunk size warning threshold
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Manual chunk splitting to reduce main bundle size
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react-router-dom') || id.includes('react/')) return 'react-vendor';
            if (id.includes('@tanstack')) return 'query-vendor';
            if (id.includes('recharts') || id.includes('d3-')) return 'chart-vendor';
            if (id.includes('@dnd-kit')) return 'dnd-vendor';
            if (id.includes('react-hook-form') || id.includes('zod')) return 'form-vendor';
            if (id.includes('date-fns')) return 'date-vendor';
            if (id.includes('lucide') || id.includes('react-hot-toast')) return 'ui-vendor';
          }
        },
      },
    },
  },

  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to Django in dev to avoid CORS issues
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
