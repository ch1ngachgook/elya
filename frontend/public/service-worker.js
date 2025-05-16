// This service worker provides caching and offline functionality for the Hotel Access app
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('hotel-app-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/static/js/main.chunk.js',
        '/static/js/bundle.js',
        '/static/css/main.chunk.css'
      ]);
    })
  );
});

// Cache first strategy for static assets
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // API requests should not be cached (except user bookings)
  if (event.request.url.includes('/api/')) {
    // Special handling for bookings API - cache then network
    if (event.request.url.includes('/api/bookings')) {
      event.respondWith(
        caches.open('bookings-cache').then(async (cache) => {
          const cachedResponse = await cache.match(event.request);
          const networkPromise = fetch(event.request).then((response) => {
            cache.put(event.request, response.clone());
            return response;
          });
          return cachedResponse || networkPromise;
        })
      );
    }
    return;
  }

  // For everything else, try the cache first, then the network
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((response) => {
        return caches.open('hotel-app-v1').then((cache) => {
          cache.put(event.request, response.clone());
          return response;
        });
      });
    })
  );
});

// Clean up old caches when a new service worker is activated
self.addEventListener('activate', (event) => {
  const cacheWhitelist = ['hotel-app-v1', 'bookings-cache'];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});