// Sahaja PDF Reader — Service Worker
// Strategy:
//   • _next/static/** → cache-first (immutable hashed assets)
//   • /pdf.worker.min.js, /manifest.json, /icons/* → cache-first
//   • /reader/** → network-only (dynamic SSR, never cache — avoids Cache.put NetworkError)
//   • Everything else → network-first, fallback to cache
//
// Fixes:
//   1. Never cache /reader/** — Next.js SSR responses are chunked/opaque and
//      cause "Cache.put() encountered a network error".
//   2. Always resolve respondWith() with a valid Response — never undefined —
//      fixing "TypeError: Failed to convert value to 'Response'".
//   3. Only cache responses with status 200 and a non-opaque type.

const CACHE_NAME = 'sahaja-reader-v2';

const PRECACHE_ASSETS = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/pdf.worker.min.js',
];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // addAll failures (e.g. icon missing) should not break install
      Promise.allSettled(PRECACHE_ASSETS.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Only cache safe, cacheable responses (no opaque, no errors, no redirects) */
function isCacheable(response) {
  return (
    response &&
    response.status === 200 &&
    response.type !== 'opaque' &&
    response.type !== 'error'
  );
}

/** Store in cache without throwing — silently ignore quota/network errors */
function tryCache(request, response) {
  if (!isCacheable(response)) return;
  caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone())).catch(() => {});
}

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only intercept same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  const path = url.pathname;

  // ── /reader/** → network-only ─────────────────────────────────────────────
  // Next.js dynamic SSR pages return chunked Transfer-Encoding responses.
  // The Cache API cannot store these — attempting to do so throws NetworkError.
  // Fall through to network; if offline, return a simple offline page.
  if (path.startsWith('/reader/')) {
    event.respondWith(
      fetch(request).catch(
        () => new Response('<h1>Offline</h1><p>Please reconnect to continue reading.</p>', {
          headers: { 'Content-Type': 'text/html' },
        })
      )
    );
    return;
  }

  // ── _next/static/** → cache-first (immutable hashed assets) ──────────────
  if (path.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          tryCache(request, response);
          return response;
        });
      })
    );
    return;
  }

  // ── Static assets (icons, manifest, pdf worker) → cache-first ────────────
  if (
    path.startsWith('/icons/') ||
    path === '/manifest.json' ||
    path === '/pdf.worker.min.js'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          tryCache(request, response);
          return response;
        });
      })
    );
    return;
  }

  // ── Everything else (/, /library, _next/data, etc.) → network-first ───────
  event.respondWith(
    fetch(request)
      .then((response) => {
        tryCache(request, response);
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        // Always return a valid Response — never undefined
        return cached ?? new Response('Offline', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        });
      })
  );
});
