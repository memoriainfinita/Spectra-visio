import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Relative base: works on GitHub Pages under /Spectra-visio/ and from any other path.
  base: './',
  plugins: [
    react(),
    // Installable and offline: everything is precached, Milkdrop included. A new version
    // waits until the app is told to reload, so nothing changes in the middle of a show.
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'SpectraVisio',
        short_name: 'SpectraVisio',
        description: 'Real-time audio visualizer for the browser.',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#06070f',
        theme_color: '#06070f',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
