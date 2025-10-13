/**
 * SICOP Analytics - Pantalla de Carga Moderna
 * 
 * @copyright 2025 Saenz Fallas S.A. - Todos los derechos reservados
 * @author Saenz Fallas S.A.
 * @company Saenz Fallas S.A.
 * @license Propiedad de Saenz Fallas S.A.
 * 
 * HQ Analytics™ - High Technology Quality Analytics
 */

import React, { useState, useEffect } from 'react';
import './ModernLoadingScreen.css';

export const ModernLoadingScreen = ({ 
  progress = 0, 
  stage = 'Iniciando...', 
  error = null,
  detailedInfo = null,
  onGoBack = null
}) => {
  const [dots, setDots] = useState('');
  const [particleCount] = useState(20);

  // Animación de puntos suspensivos
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Calcular estadísticas de carga
  const getLoadingStats = () => {
    const stats = [
      { icon: '📊', label: 'Registros procesados', value: detailedInfo?.recordsProcessed || 0 },
      { icon: '🏢', label: 'Instituciones', value: detailedInfo?.institutions || 0 },
      { icon: '📁', label: 'Archivos', value: detailedInfo?.filesProcessed || 0 },
      { icon: '⚡', label: 'Velocidad', value: detailedInfo?.speed || '---' },
    ];
    return stats;
  };

  // Obtener color del progreso
  const getProgressColor = () => {
    if (progress < 33) return '#667eea';
    if (progress < 66) return '#5e72e4';
    return '#2dce89';
  };

  // Generar partículas animadas
  const renderParticles = () => {
    return Array.from({ length: particleCount }).map((_, i) => (
      <div 
        key={i} 
        className="particle" 
        style={{
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 3}s`,
          animationDuration: `${3 + Math.random() * 4}s`
        }}
      />
    ));
  };

  return (
    <div className="modern-loading-container">
      {/* Fondo animado con partículas */}
      <div className="animated-background">
        {renderParticles()}
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      {/* Contenido principal */}
      <div className="loading-content">
        
        {/* Logo y título con animación */}
        <div className="loading-header">
          <div className="logo-container">
            <div className="logo-circle">
              <div className="logo-inner">
                {error ? '❌' : '🚀'}
              </div>
            </div>
            <div className="logo-pulse"></div>
          </div>
          
          <h1 className="loading-title">
            {error ? 'Error en la Carga' : 'SICOP Analytics'}
          </h1>
          <p className="loading-subtitle">
            HQ Analytics™ - High Technology Quality Analytics
          </p>
        </div>

        {/* Tarjeta principal de carga */}
        <div className="loading-card">
          
          {error ? (
            // Pantalla de error
            <div className="error-container">
              <div className="error-icon">⚠️</div>
              <h3 className="error-title">Error al Cargar Datos</h3>
              <div className="error-message">
                <strong>Detalles:</strong> {error}
              </div>
              <p className="error-hint">
                Por favor verifica que hayas cargado archivos CSV válidos.
              </p>
              {onGoBack && (
                <button 
                  className="error-back-button"
                  onClick={onGoBack}
                >
                  ← Volver a Inicio
                </button>
              )}
            </div>
          ) : (
            // Pantalla de carga normal
            <>
              {/* Estado actual */}
              <div className="stage-container">
                <div className="stage-icon">
                  <div className="spinner"></div>
                </div>
                <div className="stage-text">
                  <h3 className="stage-title">{stage}{dots}</h3>
                  <p className="stage-description">
                    Por favor espera mientras procesamos los datos
                  </p>
                </div>
              </div>

              {/* Barra de progreso mejorada */}
              <div className="progress-section">
                <div className="progress-header">
                  <span className="progress-label">Progreso total</span>
                  <span className="progress-percentage">{progress}%</span>
                </div>
                
                <div className="progress-bar-container">
                  <div className="progress-bar-track">
                    <div 
                      className="progress-bar-fill" 
                      style={{ 
                        width: `${progress}%`,
                        background: `linear-gradient(90deg, ${getProgressColor()} 0%, ${getProgressColor()}dd 100%)`
                      }}
                    >
                      <div className="progress-bar-shine"></div>
                    </div>
                  </div>
                  
                  {/* Marcadores de progreso */}
                  <div className="progress-markers">
                    <div className={`marker ${progress >= 25 ? 'active' : ''}`}>
                      <div className="marker-dot"></div>
                      <span className="marker-label">25%</span>
                    </div>
                    <div className={`marker ${progress >= 50 ? 'active' : ''}`}>
                      <div className="marker-dot"></div>
                      <span className="marker-label">50%</span>
                    </div>
                    <div className={`marker ${progress >= 75 ? 'active' : ''}`}>
                      <div className="marker-dot"></div>
                      <span className="marker-label">75%</span>
                    </div>
                    <div className={`marker ${progress >= 100 ? 'active' : ''}`}>
                      <div className="marker-dot"></div>
                      <span className="marker-label">100%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Estadísticas en tiempo real */}
              {detailedInfo && (
                <div className="stats-grid">
                  {getLoadingStats().map((stat, index) => (
                    <div key={index} className="stat-card" style={{ animationDelay: `${index * 0.1}s` }}>
                      <div className="stat-icon">{stat.icon}</div>
                      <div className="stat-content">
                        <div className="stat-value">{stat.value}</div>
                        <div className="stat-label">{stat.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Información adicional */}
              <div className="loading-footer">
                <div className="loading-tips">
                  <div className="tip-icon">💡</div>
                  <div className="tip-text">
                    <strong>Sabías que:</strong> Los datos se almacenan localmente para acceso rápido offline
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer con copyright */}
        <div className="loading-copyright">
          <p>© 2025 Saenz Fallas S.A. - Todos los derechos reservados</p>
        </div>
      </div>
    </div>
  );
};

export default ModernLoadingScreen;
