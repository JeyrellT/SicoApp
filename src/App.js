/**
 * SICOP Analytics - Sistema de Análisis de Contrataciones Públicas
 *
 * @copyright 2025 Saenz Fallas S.A. - Todos los derechos reservados
 * @author Saenz Fallas S.A.
 * @company Saenz Fallas S.A.
 * @license Propiedad de Saenz Fallas S.A.
 *
 * HQ Analytics™ - High Technology Quality Analytics
 */

import React from 'react';
import { useAuth } from './auth/AuthContext';
import { LoginScreen } from './auth/LoginScreen';
import { SicopProvider } from './context/SicopContext.tsx';
import { DemoPanel } from './components/DemoPanel';
import { useSaludDatos } from './hooks/api';
import './App.css';

// ================================
// INDICADOR GLOBAL DE FRESCURA DE DATOS
// ================================
// Usa GET /salud/datos (público, sin token) para mostrar cuándo se
// actualizaron los datos por última vez y si la carga fue parcial o final.

function IndicadorFrescuraDatos() {
  const { data: salud, isLoading, isError } = useSaludDatos();

  if (isLoading || isError || !salud) {
    return null;
  }

  const fecha = salud.ultima_carga
    ? new Date(salud.ultima_carga).toLocaleDateString('es-CR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'sin registro';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '6px 12px',
        fontSize: 12.5,
        fontWeight: 600,
        color: '#334155',
        background: '#f1f5f9',
        borderBottom: '1px solid #e2e8f0',
      }}
    >
      <span>
        Datos actualizados al <strong>{fecha}</strong>
        {' — '}
        <span style={{ textTransform: 'capitalize' }}>{salud.ultima_carga_estado}</span>
      </span>
    </div>
  );
}

// ================================
// CONTENIDO PRINCIPAL (SEGÚN SESIÓN)
// ================================

function AppContent() {
  const { estaAutenticado, cargando } = useAuth();

  if (cargando) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
        }}
      >
        Cargando sesión…
      </div>
    );
  }

  if (!estaAutenticado) {
    return <LoginScreen />;
  }

  return (
    <SicopProvider>
      <DemoPanel />
    </SicopProvider>
  );
}

// ================================
// APP
// ================================

function App() {
  return (
    <>
      <IndicadorFrescuraDatos />
      <AppContent />
    </>
  );
}

export default App;
