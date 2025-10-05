/**
 * SICOP Analytics - Sistema de Análisis de Contrataciones Públicas
 * 
 * @copyright 2025 Saenz Fallas S.A. - Todos los derechos reservados
 * @author Saenz Fallas S.A.
 * @company Saenz Fallas S.A.
 * @license Propiedad de Saenz Fallas S.A.
 * 
 * Este software es propiedad exclusiva de Saenz Fallas S.A.
 * Queda prohibida su reproducción, distribución o modificación
 * sin autorización expresa por escrito de Saenz Fallas S.A.
 * 
 * HQ Analytics™ - High Technology Quality Analytics
 */

import React, { useState } from 'react';
import { SicopProvider } from './context/SicopContext';
import { DemoPanel } from './components/DemoPanel';
import { DataManagementHub } from './components/DataManagementHub';
import { WelcomeScreenModern } from './components/WelcomeScreenModern';
import { dataLoaderService } from './services/DataLoaderService';
import { dataManager } from './data/DataManager';
import './App.css';

function App() {
  // Estados de navegación
  const [currentScreen, setCurrentScreen] = useState('welcome'); // 'welcome' | 'dataManagement' | 'loading' | 'mainApp'
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');
  const [loadingError, setLoadingError] = useState(null);

  // Manejar navegación a gestión de datos
  const handleGoToDataManagement = () => {
    setCurrentScreen('dataManagement');
  };

  // Manejar carga de datos y navegación a app principal
  const handleLaunchApp = async () => {
    try {
      // Verificar si hay datos en cache
      const hasCache = await dataLoaderService.hasDataInCache();
      
      if (!hasCache) {
        alert('No hay datos en cache. Por favor, primero carga archivos CSV.');
        return;
      }

      // Verificar si DataManager ya tiene datos cargados
      if (dataManager.isDataLoaded) {
        console.log('✅ DataManager ya tiene datos cargados, navegando directamente...');
        setCurrentScreen('mainApp');
        return;
      }

      // Cambiar a pantalla de carga
      setCurrentScreen('loading');
      setLoadingError(null);
      setLoadingProgress(0);
      setLoadingStage('Iniciando carga de datos...');

      // Cargar datos desde cache al DataManager
      await dataLoaderService.loadDataFromCache({
        onProgress: (progress) => {
          setLoadingProgress(progress.percentage);
          setLoadingStage(progress.stage);
          console.log(`📊 ${progress.stage}: ${progress.percentage}%`);
        }
      });

      // Esperar un momento para mostrar el 100%
      await new Promise(resolve => setTimeout(resolve, 500));

      // Navegar a la aplicación principal
      console.log('🎉 Datos cargados exitosamente, navegando a aplicación principal...');
      setCurrentScreen('mainApp');

    } catch (error) {
      console.error('💥 Error cargando datos:', error);
      setLoadingError(error.message);
      
      // Volver a la pantalla de bienvenida después de mostrar el error
      setTimeout(() => {
        setCurrentScreen('welcome');
      }, 3000);
    }
  };

  // Renderizar pantalla actual
  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'welcome':
        return (
          <WelcomeScreenModern 
            onManageData={handleGoToDataManagement}
            onLaunchApp={handleLaunchApp}
          />
        );

      case 'dataManagement':
        return (
          <DataManagementHub 
            onLaunchApp={handleLaunchApp}
          />
        );

      case 'loading':
        return (
          <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '60px',
              maxWidth: '600px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}>
              <h2 style={{ color: '#333', marginBottom: '30px', textAlign: 'center' }}>
                {loadingError ? '❌ Error al Cargar Datos' : '⏳ Cargando Datos'}
              </h2>
              
              {loadingError ? (
                <div style={{
                  background: '#ffebee',
                  border: '2px solid #f44336',
                  borderRadius: '8px',
                  padding: '20px',
                  color: '#c62828',
                  marginBottom: '20px'
                }}>
                  <strong>Error:</strong> {loadingError}
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: '20px', color: '#666', textAlign: 'center' }}>
                    {loadingStage}
                  </div>
                  
                  <div style={{
                    width: '100%',
                    height: '40px',
                    background: '#e0e0e0',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    marginBottom: '10px'
                  }}>
                    <div style={{
                      width: `${loadingProgress}%`,
                      height: '100%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      transition: 'width 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold'
                    }}>
                      {loadingProgress}%
                    </div>
                  </div>
                </>
              )}

              {loadingError && (
                <p style={{ color: '#666', textAlign: 'center', fontSize: '0.9em' }}>
                  Regresando a la pantalla de inicio...
                </p>
              )}
            </div>
          </div>
        );

      case 'mainApp':
        return (
          <SicopProvider>
            <DemoPanel />
          </SicopProvider>
        );

      default:
        return null;
    }
  };

  return (
    <div className="App">
      {renderCurrentScreen()}
    </div>
  );
}

export default App;
