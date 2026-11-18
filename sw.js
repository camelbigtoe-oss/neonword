// Offline cache. Bump VERSION after changing any app file.
const VERSION = "neonword-v15";
const CORE = [
  "./", "index.html", "style.css", "app.js", "words.js", "audio.js", "radio.js", "bg.js", "lake.js", "links.js", "links-data.js",
  "manifest.json", "icon.svg", "icon-192.png", "icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // dictionary lookups go straight to the network (the app caches results itself)
  if (url.hostname === "api.dictionaryapi.dev") return;

  // fonts: cache-first
  if (url.hostname.includes("fonts.g")) {
    e.respondWith(
      caches.open(VERSION).then(async (c) => {
        const hit = await c.match(e.request);
        if (hit) return hit;
        const res = await fetch(e.request);
        c.put(e.request, res.clone());
        return res;
      })
    );
    return;
  }

  // app files: network-first so updates land, cache fallback when offline.
  // cache: "no-cache" skips the browser's HTTP cache (GitHub Pages caches 10 min).
  e.respondWith(
    fetch(e.request, { cache: "no-cache" })
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
