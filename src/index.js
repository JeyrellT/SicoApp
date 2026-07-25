/**
 * SICOP Analytics - Sistema de Análisis de Contrataciones Públicas
 * Punto de Entrada Principal
 *
 * @copyright 2025 Saenz Fallas S.A. - Todos los derechos reservados
 * @author Saenz Fallas S.A.
 * @company Saenz Fallas S.A.
 * @license Propiedad de Saenz Fallas S.A.
 *
 * HQ Analytics™ - High Technology Quality Analytics
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './utilities.css';
import App from './App';
import { QueryProvider } from './api/QueryProvider';
import { AuthProvider } from './auth/AuthContext';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <QueryProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryProvider>
  </React.StrictMode>
);

// ========================================
// REGISTRAR SERVICE WORKER (PWA)
// ========================================

serviceWorkerRegistration.register({
  onSuccess: (registration) => {
    console.log('✅ PWA registrada exitosamente!');
    console.log('💾 La aplicación funcionará offline');

    // Opcional: Mostrar notificación al usuario
    if (Notification.permission === 'granted') {
      new Notification('SICOP Analytics instalada', {
        body: 'La aplicación está lista para funcionar offline',
        icon: '/logo192.png'
      });
    }
  },
  onUpdate: (registration) => {
    console.log('🔄 Nueva versión disponible!');

    // Preguntar al usuario si quiere actualizar
    const updateApp = window.confirm(
      '🆕 Hay una nueva versión de SICOP Analytics disponible.\n\n' +
      '¿Deseas actualizar ahora para obtener las últimas mejoras?'
    );

    if (updateApp && registration.waiting) {
      // Enviar mensaje al service worker para activar la nueva versión
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });

      // Recargar la página después de que el nuevo SW tome control
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }
});

// Verificar si la app está instalada como PWA
if (window.matchMedia('(display-mode: standalone)').matches) {
  console.log('🎉 Ejecutándose como PWA instalada');
} else {
  console.log('🌐 Ejecutándose en navegador');
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
