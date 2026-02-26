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

// =============================================
// INSTALACIÓN: borra TODO el caché previo antes
// de cachear los archivos frescos
// =============================================
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando versión:', CACHE_NAME);
  event.waitUntil(
    // 1. Borrar TODOS los cachés existentes
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            console.log('[SW] Borrando caché antiguo en install:', name);
            return caches.delete(name);
          })
        );
      })
      // 2. Crear caché limpio con archivos frescos
      .then(() => {
        console.log('[SW] Cacheando archivos frescos');
        return caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache));
      })
      // 3. Activar inmediatamente sin esperar a que cierren otras pestañas
      .then(() => self.skipWaiting())
  );
});

// =============================================
// ACTIVACIÓN: limpiar cachés viejos y tomar
// control de todas las pestañas abiertas
// =============================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando:', CACHE_NAME);
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Eliminando caché residual:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      // Tomar control inmediato de las páginas abiertas
      .then(() => self.clients.claim())
  );
});

// =============================================
// DESINSTALACIÓN: escuchar mensaje para limpiar
// (se puede llamar desde la app si es necesario)
// =============================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'CLEAR_CACHE') {
    console.log('[SW] Limpieza manual de caché solicitada');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(cacheNames.map((name) => caches.delete(name)));
      }).then(() => {
        event.ports[0] && event.ports[0].postMessage({ success: true });
      })
    );
  }
});

// =============================================
// FETCH: red primero, caché como respaldo
// Así siempre sirves contenido fresco si hay red
// =============================================
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Las llamadas a la API nunca se cachean
  if (event.request.url.includes('script.google.com')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Respuesta válida: actualizar caché y devolver
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Sin red: usar caché
        console.log('[SW] Sin red, usando caché para:', event.request.url);
        return caches.match(event.request)
          .then((cached) => cached || caches.match('/partes/index.html'));
      })
  );
});
