// ZaabuPay Service Worker v4
// Handles caching + offline fallback for PWA

const CACHE_NAME = 'zaabupay-v4';
const API_CACHE = 'zaabupay-api-v4';

const SHELL_ASSETS = ['/', '/index.html'];

const CACHEABLE_API_PATTERNS = [
  /\/api\/auth\/user/,
  /\/api\/schools\//,
  /\/api\/students/,
  /\/api\/classes/,
  /\/api\/subjects/,
  /\/api\/exams/,
  /\/api\/marks/,
  /\/api\/marks-permissions/,
  /\/api\/attendance/,
  /\/api\/fees/,
  /\/api\/stats/,
  /\/api\/payments/,
];

function isCacheableApi(pathname) {
  return CACHEABLE_API_PATTERNS.some((p) => p.test(pathname));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(SHELL_ASSETS.map((url) => cache.add(url).catch(() => {}))),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME && k !== API_CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // Vite bundles — cache-first (required for offline PWA)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return response;
        });
      }),
    );
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    const shouldCache = isCacheableApi(url.pathname);
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (shouldCache && response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          if (shouldCache) {
            const cached = await caches.match(request, { cacheName: API_CACHE });
            if (cached) return cached;
            return new Response(JSON.stringify([]), {
              headers: { 'Content-Type': 'application/json', 'X-From-SW-Cache': 'true' },
            });
          }
          return new Response(JSON.stringify({ message: 'Network error' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }),
    );
    return;
  }

  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2|ttf|webp)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return response;
        });
      }),
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(request, { cacheName: CACHE_NAME });
        if (cached) return cached;
        const index =
          (await caches.match('/', { cacheName: CACHE_NAME })) ||
          (await caches.match('/index.html', { cacheName: CACHE_NAME }));
        if (index) return index;
        return new Response('<h1>Offline</h1><p>Reconnect to load ZaabuPay.</p>', {
          headers: { 'Content-Type': 'text/html' },
        });
      }),
    );
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'zaabupay-sync') {
    event.waitUntil(
      self.clients
        .matchAll()
        .then((clients) => clients.forEach((client) => client.postMessage({ type: 'TRIGGER_SYNC' }))),
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CACHE_URLS') {
    const apiUrls = (event.data.urls || []).filter((u) => String(u).includes('/api/'));
    const otherUrls = (event.data.urls || []).filter((u) => !String(u).includes('/api/'));

    const apiPromise = caches.open(API_CACHE).then((cache) =>
      Promise.allSettled(
        apiUrls.map((url) =>
          fetch(url)
            .then((r) => (r.ok ? cache.put(url, r) : null))
            .catch(() => {}),
        ),
      ),
    );

    const shellPromise = caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        otherUrls.map((url) =>
          fetch(url)
            .then((r) => (r.ok ? cache.put(url, r) : null))
            .catch(() => {}),
        ),
      ),
    );

    event.waitUntil(Promise.all([apiPromise, shellPromise]));
  }
});
