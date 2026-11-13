import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev server proxies /api to the local DronStream (self-signed HTTPS).
export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist', sourcemap: false, assetsInlineLimit: 0 },
  server: {
    proxy: { '/api': { target: 'https://localhost:8443', changeOrigin: false, secure: false } },
  },
})
