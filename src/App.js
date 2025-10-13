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

import React, { useState, useEffect } from 'react';
import { SicopProvider, useSicop } from './context/SicopContext.tsx';
import { DemoPanel } from './components/DemoPanel';
import { DataManagementHub } from './components/DataManagementHub';
import { WelcomeScreenModern } from './components/WelcomeScreenModern.tsx';
import { ModernLoadingScreen } from './components/ModernLoadingScreen';
import './App.css';

// ================================
// CONSTANTS
// ================================

const STORAGE_KEY = 'sicop_navigation_state';
const STATE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 horas

// ================================
// HELPER FUNCTIONS
// ================================

/**
 * Obtiene el estado inicial de navegación desde localStorage
 * Valida que el estado no esté expirado y sea válido
 */
function getInitialScreen() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    
    if (!saved) {
      console.log('🆕 Primera vez - mostrando pantalla de bienvenida');
      return 'welcome';
    }

    const { currentScreen, timestamp } = JSON.parse(saved);
    
    // Validar que sea un valor válido
    if (!currentScreen || currentScreen === 'undefined') {
      console.warn('⚠️ Estado corrupto en localStorage, limpiando...');
      localStorage.removeItem(STORAGE_KEY);
      return 'welcome';
    }
    
    // Verificar expiración (24 horas)
    if (Date.now() - timestamp > STATE_EXPIRY_MS) {
      console.log('⏰ Estado expirado, volviendo a welcome');
      return 'welcome';
    }
    
    // Nunca restaurar pantalla de loading
    if (currentScreen === 'loading') {
      console.log('🏠 Redirigiendo de loading a welcome');
      return 'welcome';
    }
    
    console.log('✅ Restaurando pantalla:', currentScreen);
    return currentScreen;
    
  } catch (error) {
    console.warn('⚠️ Error restaurando estado de navegación:', error);
    localStorage.removeItem(STORAGE_KEY);
    return 'welcome';
  }
}

// ================================
// APP CONTENT (WITHIN PROVIDER)
// ================================

/**
 * Contenido principal de la app que tiene acceso al contexto
 * Separado para poder usar el hook useSicop()
 */
function AppContent() {
  const [currentScreen, setCurrentScreen] = useState(() => getInitialScreen());
  const [showDataManagementTour, setShowDataManagementTour] = useState(false);
  
  // Obtener estado del contexto
  const { 
    isLoaded, 
    isLoading, 
    load, 
    progress, 
    stage, 
    loadingDetails,
    error 
  } = useSicop();

  // ================================
  // PERSISTENCIA DE NAVEGACIÓN
  // ================================

  useEffect(() => {
    // Guardar estado de navegación en localStorage
    if (currentScreen && currentScreen !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          currentScreen,
          timestamp: Date.now()
        }));
        console.log('💾 Estado de navegación guardado:', currentScreen);
      } catch (error) {
        console.warn('⚠️ Error guardando estado:', error);
      }
    }
  }, [currentScreen]);

  // ================================
  // AUTO-CARGA EN RECARGA DE PÁGINA
  // ================================

  useEffect(() => {
    // Si estamos en mainApp pero no hay datos cargados, iniciar carga automática
    if (currentScreen === 'mainApp' && !isLoaded && !isLoading) {
      console.log('🔄 Recarga detectada en mainApp sin datos. Iniciando carga automática...');
      setCurrentScreen('loading');
      load();
    }
  }, [currentScreen, isLoaded, isLoading, load]);

  // ================================
  // AUTO-NAVEGACIÓN DESPUÉS DE CARGA
  // ================================

  useEffect(() => {
    // Cuando termina la carga, navegar a mainApp
    if (currentScreen === 'loading' && isLoaded) {
      console.log('✅ Carga completada, navegando a mainApp...');
      
      // Pequeño delay para mostrar 100% completo
      const timer = setTimeout(() => {
        setCurrentScreen('mainApp');
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [currentScreen, isLoaded]);

  // ================================
  // HANDLERS DE NAVEGACIÓN
  // ================================

  const handleLaunchApp = () => {
    console.log('🚀 Lanzando aplicación...');
    setCurrentScreen('loading');
    load(); // El efecto auto-navegará cuando termine
  };

  const handleGoToDataManagement = () => {
    console.log('📂 Navegando a gestión de datos...');
    setCurrentScreen('dataManagement');
  };

  const handleGoBackToWelcome = () => {
    console.log('🏠 Volviendo a welcome...');
    setCurrentScreen('welcome');
  };

  const handleStartTour = () => {
    console.log('🎓 Iniciando tour guiado...');
    setShowDataManagementTour(true);
    setCurrentScreen('dataManagement');
  };

  // ================================
  // RENDERIZADO
  // ================================

  const renderScreen = () => {
    switch (currentScreen) {
      case 'welcome':
        return (
          <WelcomeScreenModern 
            onManageData={handleGoToDataManagement}
            onLaunchApp={handleLaunchApp}
            onStartTour={handleStartTour}
          />
        );

      case 'dataManagement':
        return (
          <DataManagementHub 
            onLaunchApp={handleLaunchApp}
            onGoBack={handleGoBackToWelcome}
            startTour={showDataManagementTour}
            onTourComplete={() => setShowDataManagementTour(false)}
          />
        );

      case 'loading':
        return (
          <ModernLoadingScreen 
            progress={progress}
            stage={stage}
            error={error?.message || null}
            detailedInfo={loadingDetails}
            onGoBack={handleGoBackToWelcome}
          />
        );

      case 'mainApp':
        return (
          <DemoPanel onGoBackToWelcome={handleGoBackToWelcome} />
        );

      default:
        console.warn('⚠️ Pantalla desconocida:', currentScreen);
        return (
          <WelcomeScreenModern 
            onManageData={handleGoToDataManagement}
            onLaunchApp={handleLaunchApp}
            onStartTour={handleStartTour}
          />
        );
    }
  };

  return renderScreen();
}

// ================================
// APP WRAPPER (WITH PROVIDER)
// ================================

function App() {
  return (
    <SicopProvider>
      <AppContent />
    </SicopProvider>
  );
}

export default App;
