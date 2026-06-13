import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // heimdall-ui >= 0.4.0 exposes the "./fonts" subpath export, which resolves to
  // dist/fonts/fonts.css. Its @font-face rules reference /fonts/... served from public/.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
