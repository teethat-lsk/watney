/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // The admin calls PocketBase at its own origin (see src/main.tsx).
    proxy: {
      '/api': 'http://localhost:8090',
    },
  },
  test: {
    environment: 'jsdom',
  },
})
