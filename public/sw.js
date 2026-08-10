const BUILD_ID = "Et-tx5Y2qLM1wiRoWw5yo";
const CACHE_PREFIX = "fitness-pwa-";
const CACHE_NAME = `${CACHE_PREFIX}${BUILD_ID}`;
const OFFLINE_URL = "/";
const PRECACHE_URLS = Object.freeze([
  "/",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/_next/static/css/9012550769953be6.css",
  "/_next/static/chunks/webpack-4a462cecab786e93.js",
  "/_next/static/chunks/4bd1b696-c023c6e3521b1417.js",
  "/_next/static/chunks/255-98a0bdaa30757bda.js",
  "/_next/static/chunks/main-app-e015451192d67126.js",
  "/_next/static/chunks/380-af7404fdf99de7d7.js",
  "/_next/static/chunks/app/layout-d167eecbf0ffea9c.js",
  "/_next/static/chunks/942-ae255d69dc551ab8.js",
  "/_next/static/chunks/app/page-aa750021b671e760.js",
  "/_next/static/chunks/polyfills-42372ed130431b0a.js"
]);
const PRECACHE_PATHS = new Set(PRECACHE_URLS);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const requests = PRECACHE_URLS.map((url) => new Request(url, { cache: "reload" }));
      await cache.addAll(requests);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || PRECACHE_PATHS.has(url.pathname)) {
    event.respondWith(cacheFirstAsset(request));
  }
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(OFFLINE_URL, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(OFFLINE_URL);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}
