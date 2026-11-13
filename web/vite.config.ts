import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev server proxies /api to the local DronStream (self-signed HTTPS).
// DS_DEV_API points it at another instance (e.g. a test server on other ports).
const api = process.env.DS_DEV_API || 'https://localhost:8443'
export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist', sourcemap: false, assetsInlineLimit: 0 },
  server: {
    proxy: { '/api': { target: api, changeOrigin: false, secure: false } },
  },
})
