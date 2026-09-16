import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Yomu',
        short_name: 'Yomu',
        description: 'Personal manga/manhwa/manhua reader',
        theme_color: '#0D0D0D',
        background_color: '#0D0D0D',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          // ponytail: placeholder icons; real icons added in Phase 6 (PWA hardening)
        ],
      },
    }),
  ],
})
