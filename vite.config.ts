import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Luyện tiếng Trung',
        short_name: 'Tiếng Trung',
        description: 'Luyện viết, nói, nghe và ôn từ vựng tiếng Trung có sửa lỗi.',
        lang: 'vi',
        start_url: '/',
        display: 'standalone',
        background_color: '#131820',
        theme_color: '#131820',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // app shell is precached; vocabulary data and strokes are cached when first used
        globPatterns: ['**/*.{js,css,html,png}'],
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          { urlPattern: ({ url }) => url.pathname.startsWith('/data/'), handler: 'StaleWhileRevalidate', options: { cacheName: 'app-data', expiration: { maxEntries: 3000 } } },
          { urlPattern: ({ url }) => /fonts\.(googleapis|gstatic)\.com/.test(url.host), handler: 'CacheFirst', options: { cacheName: 'fonts', expiration: { maxEntries: 30 } } },
        ],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts', 'netlify/**/*.test.ts'],
  },
});
