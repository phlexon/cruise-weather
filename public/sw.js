const CACHE_NAME = "cruisecast-v1";
const ASSETS = [
  "/", 
  "/index.html",
  "/manifest.webmanifest",
  "/pwa-192.png",
  "/pwa-512.png"
];

// Install SW → Pre-cache core assets (App Shell)
self.addEventListener("install", (event) => {
  console.log("[SW] Install");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Pre-caching assets");
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate SW → Clean old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activate");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[SW] Removing old cache", key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  return self.clients.claim();
});

// Fetch handler → Cache-first strategy
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(event.request).catch(() =>
          // Optional offline fallback:
          new Response(
            "You're offline. Please reconnect and try again.",
            { status: 503, statusText: "Offline" }
          )
        )
      );
    })
  );
});
