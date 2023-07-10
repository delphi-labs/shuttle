import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  optimizeDeps: {
    include: ['@delphi-labs/shuttle-vue']
  },
  build: {
    commonjsOptions: {
      include: [/shuttle-vue/, /node_modules/]
    }
  }
})
