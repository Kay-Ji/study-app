/*
 * PlanAI Service Worker — offline-first cho chế độ "điện thoại độc lập".
 *
 * Chiến lược:
 *  - App shell (HTML/JS/CSS/icon): cache-first, cập nhật nền (stale-while-revalidate)
 *  - Điều hướng trang (navigate): network-first, rớt lại shell đã cache → app luôn mở được
 *  - /api/*: KHÔNG bao giờ cache (dữ liệu live do Express hoặc localApi xử lý;
 *    chế độ offline dữ liệu nằm trong localStorage nên không cần cache API)
 */
const CACHE_NAME = 'planai-shell-v1';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Same-origin only
  if (url.origin !== self.location.origin) return;

  // Never cache API traffic (offline data lives in localStorage via localApi)
  if (url.pathname.startsWith('/api/')) return;

  // Page navigations: network-first, fallback to cached shell (offline app launch)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
    );
    return;
  }

  // Static assets: stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && (req.destination === 'image' || req.destination === 'script' || req.destination === 'style' || req.destination === 'font' || req.destination === 'manifest')) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
