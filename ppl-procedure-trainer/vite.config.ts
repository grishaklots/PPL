import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path is configurable for project hosting. It defaults to "/" (works for
// Vercel/Netlify/Cloudflare and local dev). For a GitHub project page served
// from https://<user>.github.io/<repo>/, set BASE_PATH=/<repo>/ at build time
// (the included GitHub Pages workflow does this automatically).
// https://vite.dev/config/
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
})
