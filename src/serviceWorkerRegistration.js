/**
 * SICOP Analytics - Service Worker Registration
 * Módulo para registrar y gestionar el Service Worker de la PWA
 * 
 * @copyright 2025 Saenz Fallas S.A. - Todos los derechos reservados
 * @author Saenz Fallas S.A.
 * @company Saenz Fallas S.A.
 * @license Propiedad de Saenz Fallas S.A.
 * 
 * HQ Analytics™ - High Technology Quality Analytics
 */

// ========================================
// CONFIGURACIÓN
// ========================================

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

// ========================================
// FUNCIONES PÚBLICAS
// ========================================

/**
 * Registrar el Service Worker
 * @param {Object} config - Configuración de callbacks
 * @param {Function} config.onSuccess - Callback cuando se registra exitosamente
 * @param {Function} config.onUpdate - Callback cuando hay una actualización disponible
 */
export function register(config) {
  // Solo registrar en producción y si el navegador lo soporta
  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    // Verificar que la URL pública coincida con el origen
    const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      console.warn('[PWA] ⚠️ PUBLIC_URL no coincide con el origen, SW no se registrará');
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

      if (isLocalhost) {
        // En localhost, verificar si el SW es válido
        checkValidServiceWorker(swUrl, config);

        navigator.serviceWorker.ready.then(() => {
          console.log(
            '[PWA] 🚀 Esta app está siendo servida por un service worker en localhost.\n' +
            'Más info: https://cra.link/PWA'
          );
        });
      } else {
        // En producción, registrar directamente
        registerValidSW(swUrl, config);
      }
    });
  } else {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[PWA] ℹ️ Service Worker no se registra en modo desarrollo');
    } else {
      console.warn('[PWA] ⚠️ Service Worker no soportado en este navegador');
    }
  }
}

/**
 * Desregistrar el Service Worker
 */
export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister().then(() => {
          console.log('[PWA] 🗑️ Service Worker desregistrado');
        });
      })
      .catch((error) => {
        console.error('[PWA] ❌ Error al desregistrar:', error.message);
      });
  }
}

/**
 * Limpiar todas las cachés
 */
export async function clearCaches() {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    console.log('[PWA] 🗑️ Todas las cachés eliminadas');
    return true;
  }
  return false;
}

/**
 * Obtener tamaño de caché
 */
export async function getCacheSize() {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    return 0;
  }

  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data.size || 0);
    };

    navigator.serviceWorker.controller.postMessage(
      { type: 'GET_CACHE_SIZE' },
      [messageChannel.port2]
    );

    // Timeout de 5 segundos
    setTimeout(() => resolve(0), 5000);
  });
}

/**
 * Verificar si hay actualizaciones del SW
 */
export async function checkForUpdates() {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
      console.log('[PWA] 🔄 Verificando actualizaciones...');
    }
  }
}

// ========================================
// FUNCIONES PRIVADAS
// ========================================

/**
 * Registrar un Service Worker válido
 */
function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('[PWA] ✅ Service Worker registrado exitosamente');

      // Detectar actualizaciones
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // Nueva versión disponible
              console.log(
                '[PWA] 🔄 Nueva versión disponible!\n' +
                'La app se actualizará cuando todas las pestañas estén cerradas.'
              );

              // Ejecutar callback de actualización
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // Primera instalación
              console.log('[PWA] 💾 Contenido pre-cacheado para uso offline');

              // Ejecutar callback de éxito
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };

      // Verificar actualizaciones cada 60 minutos
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);
    })
    .catch((error) => {
      console.error('[PWA] ❌ Error al registrar Service Worker:', error);
    });
}

/**
 * Verificar que el Service Worker sea válido
 */
function checkValidServiceWorker(swUrl, config) {
  // Verificar que el SW existe
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // Service Worker no encontrado, recargar página
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service Worker encontrado, proceder con registro
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('[PWA] 📡 Sin conexión a internet. App en modo offline.');
    });
}

// ========================================
// DETECCIÓN DE ESTADO
// ========================================

/**
 * Verificar si la app está instalada como PWA
 */
export function isInstalled() {
  // Verificar si está en modo standalone
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // Verificar en Safari iOS
  if (window.navigator.standalone === true) {
    return true;
  }

  return false;
}

/**
 * Verificar si el SW está activo
 */
export function isServiceWorkerActive() {
  return 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null;
}

/**
 * Obtener información del Service Worker
 */
export async function getServiceWorkerInfo() {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  
  if (!registration) {
    return null;
  }

  return {
    active: registration.active !== null,
    installing: registration.installing !== null,
    waiting: registration.waiting !== null,
    updateViaCache: registration.updateViaCache,
    scope: registration.scope
  };
}

// ========================================
// EVENTOS GLOBALES
// ========================================

/**
 * Escuchar cambios en el estado de conexión
 */
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[PWA] 🌐 Conexión a internet restaurada');
    
    // Verificar actualizaciones cuando vuelva la conexión
    checkForUpdates();
  });

  window.addEventListener('offline', () => {
    console.log('[PWA] 📡 Sin conexión a internet - Modo offline activado');
  });
}

// ========================================
// LOGGING
// ========================================

console.log('[PWA] 📱 Módulo de Service Worker cargado');

const serviceWorkerRegistration = {
  register,
  unregister,
  clearCaches,
  getCacheSize,
  checkForUpdates,
  isInstalled,
  isServiceWorkerActive,
  getServiceWorkerInfo
};

export default serviceWorkerRegistration;
