
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwind(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'favicon.ico'],
      manifest: {
        name: 'Gestor Financeiro',
        short_name: 'Orçamento',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#0ea5e9',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],

  server: {
    host: true, // permite aceder via IP na mesma rede
    port: 5173,
  },

  build: {
    rollupOptions: {
      output: {
        // ✅ manualChunks como função (compatível com rolldown-vite v7)
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/recharts/')) return 'recharts'
            if (id.includes('/xlsx/')) return 'xlsx'
            if (
              id.includes('/firebase/app/') ||
              id.includes('/firebase/auth/') ||
              id.includes('/firebase/firestore/')
            ) {
              return 'firebase'
            }
            // opcional: tudo o resto dos vendors num único chunk
            return 'vendor'
          }
          // sem split para código da app
          return undefined
               },
      },
    },
    // opcional: aumenta o limite de aviso de tamanho
    chunkSizeWarningLimit: 1500,
  },
})