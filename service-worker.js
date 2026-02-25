const CACHE_NAME = 'partes-cache-v4';
const urlsToCache = [
  '/partes/',
  '/partes/index.html',
  '/partes/app.html',
  '/partes/config.js',
  '/partes/manifest.json',
  '/partes/icon-192.png',
  '/partes/icon-512.png'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptar peticiones
self.addEventListener('fetch', (event) => {
  // Solo cachear peticiones GET
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Si está en cache, devolverlo
        if (response) {
          return response;
        }

        // Si no, hacer fetch
        return fetch(event.request).then((response) => {
          // Verificar que sea una respuesta válida
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clonar la respuesta
          const responseToCache = response.clone();

          // Guardar en cache
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        return caches.match('/partes/index.html');
      })
  );
});
