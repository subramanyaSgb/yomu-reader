import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Split firebase into its own chunk so the main bundle stays lean (NFR small footprint).
        manualChunks(id) {
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'firebase'
          }
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      workbox: {
        // New-chapter push handlers live in a static script pulled into the SW.
        importScripts: ['push-sw.js'],
        // Don't precache the big lazy chunks (pdf.worker ~2.2MB, firebase ~540KB) —
        // they'd download on every install/SW update even if never used. Runtime
        // caching below picks them up on first real use (still offline afterwards).
        globIgnores: ['**/pdf.worker*', '**/firebase-*'],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/.*\.(js|mjs)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'lazy-assets',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          // Chapter lists / pages / MD API: network first, fall back to last-known
          // response when offline (downloaded chapters stay readable end-to-end).
          {
            urlPattern: /^https:\/\/yomu-image-proxy\..*\.workers\.dev\/(scrape\?site=kakalot&action=(chapters|pages|search).*|api\/.*)$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-json',
              networkTimeoutSeconds: 15,
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [200] },
            },
          },
          // Covers: tiny, cache-first for instant shelves + offline covers.
          {
            urlPattern: /^https:\/\/yomu-image-proxy\..*\.workers\.dev\/scrape\?site=kakalot&action=img.*cover.*$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'covers',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
      manifest: {
        name: 'Yomu',
        short_name: 'Yomu',
        description: 'Personal manga/manhwa/manhua reader',
        theme_color: '#0D0D0D',
        background_color: '#0D0D0D',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})
