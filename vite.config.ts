import { defineConfig } from 'vite'

export default defineConfig({
  base: '/saml-idp-configuration/',
  server: {
    host: '0.0.0.0',
    port: 3030,
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
})
