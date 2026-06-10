import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Dev: forward API + uploaded files to the Express server so the client can
  // use relative URLs (/api, /uploads) that also work in production, where
  // Express serves the built client from the same origin.
  server: {
    proxy: {
      '/api':     'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
    },
  },
})
