import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The Cloudflare plugin runs the Worker (worker/index.ts) inside the dev server, so the site and the
// API share one origin in development just like in production.
export default defineConfig({
  plugins: [react(), cloudflare()],
})
