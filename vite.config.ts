import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { compression } from 'vite-plugin-compression2'
import { visualizer } from 'rollup-plugin-visualizer'
import Sitemap from 'vite-plugin-sitemap'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 5173,
  },
  plugins: [
    react(),
    tailwindcss(),
    // PWA: autoUpdate service worker. HARD RULE: the SW must never intercept,
    // cache, or log cross-origin provider requests (API keys ride those requests).
    // runtimeCaching is empty so the SW only serves its same-origin precache.
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Gridloom',
        short_name: 'Gridloom',
        description:
          'Run one prompt across every model and seed at once, on your own API keys.',
        theme_color: '#F3EFE6',
        background_color: '#F3EFE6',
        display: 'standalone',
        start_url: '/generate',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        // No runtime caching at all: provider API calls go browser -> provider
        // directly and the service worker never sees, caches, or logs them.
        // (Workbox only routes what runtimeCaching declares; with none declared,
        // cross-origin requests pass straight through.)
        runtimeCaching: [],
        globIgnores: ['**/stats.html', '**/node_modules/**'],
      },
    }),
    // Sitemap + robots.txt for the marketing routes only; studio routes are the
    // app, not pages. '/' comes from the plugin's scan of the built index.html;
    // 404.html and the visualizer report are excluded, so the sitemap carries
    // exactly /, /terms, /privacy.
    Sitemap({
      hostname: 'https://gridloom.app',
      dynamicRoutes: ['/terms', '/privacy'],
      exclude: ['/404', '/stats'],
      generateRobotsTxt: true,
      robots: [{ userAgent: '*', allow: '/' }],
    }),
    // Build-time only: pre-compress assets so Cloudflare Pages serves .br/.gz.
    compression({ algorithms: ['brotliCompress', 'gzip'], threshold: 1024 }),
    // Build-time only: bundle report at dist/stats.html. Never shipped to users
    // (excluded from the SW precache via globIgnores above).
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
})
