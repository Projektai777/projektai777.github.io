// Minimal service worker: makes the app installable and offline-capable.
// API calls (Supabase) always go to the network.
//
// NETWORK-FIRST (not cache-first): the app config (tenants.js) and code
// change every time we onboard a client or build a demo, so we must always
// prefer the fresh network copy and only fall back to cache when offline.
// A cache-first worker once served a stale tenants.js and a new tenant
// showed "Kortelė nerasta" for everyone who had visited before.
const CACHE = 'lojalumas-v30';
const SHELL = ['./', './index.html', './app.js', './tenants.js', './totp.js', './styles.css', './manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim()) // take control of open pages immediately
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // never cache Supabase
  // Network-first: fetch fresh, refresh the cache on success, and fall
  // back to the cached copy only when the network is unavailable.
  // `cache: 'no-cache'` forces the browser to REVALIDATE with the server
  // (via ETag) instead of silently serving a stale HTTP-cached copy — GitHub
  // Pages sets a cache header on app.js/tenants.js, so a plain fetch() could
  // otherwise return old code even though we're "network-first".
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
