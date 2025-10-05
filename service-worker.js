/**
 * SICOP Analytics - Service Worker
 * Progressive Web App - Offline Support
 * 
 * @copyright 2025 Saenz Fallas S.A. - Todos los derechos reservados
 * @author Saenz Fallas S.A.
 * @company Saenz Fallas S.A.
 * @license Propiedad de Saenz Fallas S.A.
 * 
 * HQ Analytics™ - High Technology Quality Analytics
 */

// ========================================
// CONFIGURACIÓN DE CACHÉ
// ========================================

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `sicop-analytics-${CACHE_VERSION}`;
const DATA_CACHE_NAME = `sicop-data-${CACHE_VERSION}`;
const IMAGE_CACHE_NAME = `sicop-images-${CACHE_VERSION}`;

// Recursos críticos para pre-cachear (App Shell)
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
  '/logo-hq-analytics.png',
  '/favicon.ico'
];

// ========================================
// EVENTOS DEL SERVICE WORKER
// ========================================

/**
 * INSTALACIÓN
 * Se ejecuta cuando el service worker se instala por primera vez
 */
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] 📦 Instalando SICOP Analytics PWA...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] 💾 Pre-cacheando App Shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[ServiceWorker] ✅ Instalación completa');
        // Forzar activación inmediata
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[ServiceWorker] ❌ Error en instalación:', error);
      })
  );
});

/**
 * ACTIVACIÓN
 * Se ejecuta cuando el service worker toma control
 */
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] 🚀 Activando nueva versión...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Eliminar cachés antiguas
            if (cacheName !== CACHE_NAME && 
                cacheName !== DATA_CACHE_NAME && 
                cacheName !== IMAGE_CACHE_NAME) {
              console.log('[ServiceWorker] 🗑️ Eliminando caché antigua:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[ServiceWorker] ✅ Activación completa');
        // Tomar control inmediato de todas las páginas
        return self.clients.claim();
      })
  );
});

/**
 * FETCH - ESTRATEGIAS DE CACHÉ
 * Maneja todas las peticiones de la aplicación
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar peticiones que no sean del mismo origen (CDNs, APIs externas)
  if (url.origin !== location.origin) {
    return;
  }

  // Estrategia 1: DATOS CSV - Network First, fallback to Cache
  if (request.url.includes('.csv') || 
      request.url.includes('/data/') ||
      request.url.includes('indexedDB')) {
    event.respondWith(networkFirstStrategy(request, DATA_CACHE_NAME));
    return;
  }

  // Estrategia 2: IMÁGENES - Cache First, fallback to Network
  if (request.destination === 'image' || 
      request.url.match(/\.(jpg|jpeg|png|gif|svg|webp|ico)$/)) {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE_NAME));
    return;
  }

  // Estrategia 3: API/JSON - Network First con timeout
  if (request.url.includes('/api/') || 
      request.url.includes('.json')) {
    event.respondWith(networkFirstStrategy(request, DATA_CACHE_NAME));
    return;
  }

  // Estrategia 4: ASSETS ESTÁTICOS (JS, CSS) - Cache First
  if (request.url.match(/\.(js|css|woff2?|ttf|eot)$/)) {
    event.respondWith(cacheFirstStrategy(request, CACHE_NAME));
    return;
  }

  // Estrategia 5: NAVEGACIÓN (HTML) - Network First
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Estrategia por defecto: Network First
  event.respondWith(networkFirstStrategy(request, CACHE_NAME));
});

// ========================================
// ESTRATEGIAS DE CACHÉ
// ========================================

/**
 * Network First - Intenta red primero, luego caché
 * Ideal para datos que cambian frecuentemente
 */
async function networkFirstStrategy(request, cacheName) {
  try {
    // Intentar obtener de la red
    const networkResponse = await fetch(request);
    
    // Si la respuesta es válida, guardar en caché
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Si falla la red, intentar caché
    console.log('[ServiceWorker] 📡 Sin conexión, usando caché:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Si no hay caché, retornar respuesta offline
    return new Response(
      JSON.stringify({ 
        error: 'Sin conexión a internet',
        offline: true,
        message: 'Los datos no están disponibles offline'
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 503
      }
    );
  }
}

/**
 * Cache First - Intenta caché primero, luego red
 * Ideal para recursos estáticos que no cambian
 */
async function cacheFirstStrategy(request, cacheName) {
  // Intentar obtener de caché
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Si no está en caché, obtener de red y cachear
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[ServiceWorker] ❌ Error cargando recurso:', request.url);
    
    // Retornar respuesta de error
    return new Response('Recurso no disponible offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// ========================================
// MENSAJES DEL CLIENTE
// ========================================

/**
 * Escuchar mensajes desde la aplicación
 */
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] 📨 Mensaje recibido:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    // Forzar actualización inmediata
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    // Limpiar todas las cachés
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }).then(() => {
        console.log('[ServiceWorker] 🗑️ Todas las cachés eliminadas');
        // Responder al cliente
        event.ports[0].postMessage({ success: true });
      })
    );
  }
  
  if (event.data && event.data.type === 'GET_CACHE_SIZE') {
    // Calcular tamaño de caché
    event.waitUntil(
      getCacheSize().then((size) => {
        event.ports[0].postMessage({ size });
      })
    );
  }
});

/**
 * Calcular tamaño total de caché
 */
async function getCacheSize() {
  let totalSize = 0;
  
  const cacheNames = await caches.keys();
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }
  
  return totalSize;
}

// ========================================
// BACKGROUND SYNC
// ========================================

/**
 * Sincronización en background cuando vuelva la conexión
 */
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] 🔄 Sincronizando datos...');
  
  if (event.tag === 'sync-csv-data') {
    event.waitUntil(syncCSVData());
  }
});

async function syncCSVData() {
  try {
    console.log('[ServiceWorker] 📊 Sincronizando datos CSV...');
    // Aquí iría la lógica de sincronización de datos
    // Por ahora solo registramos el evento
    return Promise.resolve();
  } catch (error) {
    console.error('[ServiceWorker] ❌ Error en sincronización:', error);
    throw error;
  }
}

// ========================================
// NOTIFICACIONES PUSH (Opcional)
// ========================================

/**
 * Manejar notificaciones push
 */
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] 🔔 Notificación push recibida');
  
  const options = {
    body: event.data ? event.data.text() : 'Nueva actualización disponible',
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('SICOP Analytics', options)
  );
});

/**
 * Manejar clicks en notificaciones
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] 👆 Click en notificación');
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});

// ========================================
// LOGGING Y DEBUG
// ========================================

console.log(`
╔═══════════════════════════════════════════════════════╗
║   SICOP Analytics - Service Worker Iniciado          ║
║   Version: ${CACHE_VERSION}                          ║
║   © 2025 Saenz Fallas S.A.                           ║
║   HQ Analytics™ - High Technology Quality            ║
╚═══════════════════════════════════════════════════════╝
`);
