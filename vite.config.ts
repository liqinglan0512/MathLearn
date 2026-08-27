import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// Source-inspection attributes are useful locally but do not belong in production output.
export default defineConfig(({ command }) => ({
  base: '/',
  plugins: [command === 'serve' && inspectAttr(), react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll('\\', '/')
          if (normalizedId.includes('/src/lib/euclid-data.json')) return 'euclid-corpus'
          if (normalizedId.includes('/src/lib/euclid-modern-zh.json')) return 'euclid-modern-zh'
          if (normalizedId.includes('/node_modules/')) return 'vendor'
        },
      },
    },
  },
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
