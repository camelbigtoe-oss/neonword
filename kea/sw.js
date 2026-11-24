// KEA service worker: app shell offline, news network-first, saved images cached.
const SHELL = 'kea-shell-v1';
const DATA = 'kea-data-v1';
const IMG = 'kea-img-v1';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'icon.svg', 'icon-192.png', 'manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => ![SHELL, DATA, IMG].includes(k)).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin === location.origin && url.pathname.includes('/data/')) {
    // News: always try the network, fall back to the last copy when offline.
    const key = url.origin + url.pathname;
    e.respondWith(fetch(e.request).then((r) => {
      if (r.ok) { const copy = r.clone(); caches.open(DATA).then((c) => c.put(key, copy)); }
      return r;
    }).catch(() => caches.match(key)));
    return;
  }
  if (url.origin === location.origin) {
    // App files: stale-while-revalidate so updates land on the next open.
    e.respondWith(caches.open(SHELL).then(async (c) => {
      const hit = await c.match(e.request, { ignoreSearch: true });
      const net = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (e.request.destination === 'image') {
    // Images of saved stories were stored on save; serve those offline.
    e.respondWith(caches.open(IMG).then(async (c) => (await c.match(e.request.url)) || fetch(e.request)));
  }
});

self.addEventListener('message', (e) => {
  if (e.data?.type === 'cache-img') {
    caches.open(IMG).then((c) => fetch(e.data.url, { mode: 'no-cors' }).then((r) => c.put(e.data.url, r)).catch(() => {}));
  }
});
