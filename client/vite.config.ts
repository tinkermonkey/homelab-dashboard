import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // The package does not export ./fonts — resolve it to the dist fonts CSS.
      // The fonts.css uses absolute paths (/fonts/...) which Vite serves from public/.
      '@tinkermonkey/heimdall-ui/fonts': path.resolve(
        __dirname,
        'node_modules/@tinkermonkey/heimdall-ui/dist/fonts/fonts.css'
      ),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
