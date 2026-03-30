// ZaabuPay Service Worker v1.0
// Handles caching + offline fallback for PWA

const CACHE_NAME = 'zaabupay-v1';
const API_CACHE = 'zaabupay-api-v1';

// Static shell assets to cache on install
const SHELL_ASSETS = [
  '/',
  '/dashboard',
  '/students',
  '/classes',
  '/subjects',
  '/exams',
  '/marks',
  '/attendance',
];

// API routes to cache for offline reading
const CACHEABLE_API_PATTERNS = [
  /\/api\/students/,
  /\/api\/classes/,
  /\/api\/subjects/,
  /\/api\/exams/,
  /\/api\/marks/,
  /\/api\/attendance/,
  /\/api\/fees/,
  /\/api\/stats/,
];

// ── Install: pre-cache the app shell ─────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Best-effort shell caching — don't fail install if an asset 404s
      return Promise.allSettled(
        SHELL_ASSETS.map(url => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: remove stale caches ────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== API_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for API, cache-first for static ─────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, chrome-extension, etc.
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // API calls: network-first, fall back to cached response
  if (url.pathname.startsWith('/api/')) {
    const shouldCache = CACHEABLE_API_PATTERNS.some(p => p.test(url.pathname));
    event.respondWith(
      fetch(request).then(response => {
        if (shouldCache && response.ok) {
          const clone = response.clone();
          caches.open(API_CACHE).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(async () => {
        if (shouldCache) {
          const cached = await caches.match(request, { cacheName: API_CACHE });
          if (cached) return cached;
        }
        // Return empty array for list endpoints so UI shows empty state
        const pathname = url.pathname;
        if (pathname.includes('/api/')) {
          return new Response(JSON.stringify([]), {
            headers: { 'Content-Type': 'application/json', 'X-From-SW-Cache': 'true' }
          });
        }
        return new Response('Offline', { status: 503 });
      })
    );
    return;
  }

  // Static assets: cache-first
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2|ttf)$/)
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // HTML navigation: network-first, fall back to cached /
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(request, { cacheName: CACHE_NAME });
        if (cached) return cached;
        // SPA fallback — serve index from cache
        return caches.match('/', { cacheName: CACHE_NAME }) ||
               new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } });
      })
    );
  }
});

// ── Background Sync: replay queued actions ────────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'zaabupay-sync') {
    event.waitUntil(
      // Notify all clients to trigger their sync
      self.clients.matchAll().then(clients =>
        clients.forEach(client => client.postMessage({ type: 'TRIGGER_SYNC' }))
      )
    );
  }
});

// ── Push Messages: relay to clients ──────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CACHE_URLS') {
    caches.open(API_CACHE).then(cache =>
      Promise.allSettled(
        (event.data.urls || []).map((url) => fetch(url).then(r => r.ok ? cache.put(url, r) : null).catch(() => {}))
      )
    );
  }
});
