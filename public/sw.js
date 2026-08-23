const CACHE_PREFIX = 'yuncun-';
const CACHE_VERSION = 'v5';
const SHELL_CACHE = `${CACHE_PREFIX}shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}runtime-${CACHE_VERSION}`;
const APP_SHELL = ['/', '/workspace/', '/world/cloud-village/', '/world/rain-bridge/', '/world/star-abyss/', '/world/moon-pool/', '/world/snow-cliff/', '/world/lantern-lane/', '/offline.html', '/manifest.webmanifest'];
const MAX_RUNTIME_ENTRIES = 80;

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - maxEntries)).map((key) => cache.delete(key)));
}

async function storeResponse(request, response) {
  if (!response || !response.ok || response.status !== 200) return;
  const cache = await caches.open(RUNTIME_CACHE);
  await cache.put(request, response.clone());
  await trimCache(RUNTIME_CACHE, MAX_RUNTIME_ENTRIES);
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== SHELL_CACHE && key !== RUNTIME_CACHE)
      .map((key) => caches.delete(key)),
  )));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || request.headers.has('range')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        event.waitUntil(storeResponse(request, response));
        return response;
      } catch {
        return (await caches.match(request)) || (await caches.match('/offline.html'));
      }
    })());
    return;
  }

  if (!['style', 'script', 'font', 'image'].includes(request.destination)) return;

  event.respondWith((async () => {
    const cached = await caches.match(request);
    const network = fetch(request).then((response) => {
      event.waitUntil(storeResponse(request, response));
      return response;
    }).catch(() => cached || Response.error());
    return cached || network;
  })());
});
