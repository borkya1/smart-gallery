import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // When running in Docker (build context is ./), we need to look in current dir.
  // Locally, if we want to look up, we can keep it valid, but simpler to just expect .env in current dir for now 
  // or checks process.env.
  // Let's remove the explicit envDir '../' to fall back to default (current dir) which works for Docker.
  // Using relative path './' is explicit.
  envDir: './',
})
