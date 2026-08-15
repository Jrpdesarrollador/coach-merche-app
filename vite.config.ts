import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: [
        'assets/icons/pwa-icon-192-green.png',
        'assets/icons/pwa-icon-512-green.png',
        'assets/icons/pwa-icon-maskable-512-green.png',
        'assets/icons/pwa-apple-touch-green.png',
        'assets/brand/logo-coach-merche.png',
        'assets/brand/logo-coach-merche-green.png',
        'assets/brand/coach-avatar-intro.png',
        'manifest.webmanifest',
      ],
      manifest: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,webp,woff2}'],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
