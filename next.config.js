/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  fallbacks: {
    document: '/offline',
  },
  runtimeCaching: [
    {
      // Google Fonts stylesheets — cache first
      urlPattern: /^https:\/\/fonts\.googleapis\.com/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-stylesheets',
        expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
      },
    },
    {
      // Google Fonts webfonts — cache first
      urlPattern: /^https:\/\/fonts\.gstatic\.com/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts',
        expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
      },
    },
    {
      // cdnjs (PDF.js etc.) — cache first
      urlPattern: /^https:\/\/cdnjs\.cloudflare\.com/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'cdnjs-pdfjs',
        expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 90 },
      },
    },
    {
      // Supabase API — network first, fall back to cache
      urlPattern: ({ url }) => url.hostname.includes('supabase.co') && url.pathname.includes('/rest/'),
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api',
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
      },
    },
    {
      // Supabase Storage (PDF files) — cache first after first download
      urlPattern: ({ url }) => url.hostname.includes('supabase.co') && url.pathname.includes('/storage/'),
      handler: 'CacheFirst',
      options: {
        cacheName: 'pdf-storage',
        expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      // Next.js static assets — stale while revalidate
      urlPattern: /^\/_next\//,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'nextjs-static',
        expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    {
      // Everything else — network first with offline fallback
      urlPattern: /.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'default',
        networkTimeoutSeconds: 10,
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
      },
    },
  ],
});

const nextConfig = {
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
