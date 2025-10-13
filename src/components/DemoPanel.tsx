/**
 * SICOP Analytics - Sistema de Análisis de Contrataciones Públicas
 * Panel Principal de Análisis
 * 
 * @copyright 2025 Saenz Fallas S.A. - Todos los derechos reservados
 * @author Saenz Fallas S.A.
 * @company Saenz Fallas S.A.
 * @license Propiedad de Saenz Fallas S.A.
 * 
 * HQ Analytics™ - High Technology Quality Analytics
 */

// ================================
// PANEL PRINCIPAL DE ANÁLISIS
// ================================
// Panel principal con todas las funcionalidades del sistema

import React, { useState } from 'react';
import { useSicop } from '../context/SicopContext';
import ModernDashboard from './ModernDashboard';
import InstitucionesDashboard from './InstitucionesDashboard';
import SicopExplorer from './SicopExplorer';
import CategoryManager from './CategoryManager/CategoryManager';
import ReportsPanel from './ReportsPanel';
import './DemoPanel.css';

interface DemoPanelProps {
  onGoBackToWelcome?: () => void;
}

export const DemoPanel: React.FC<DemoPanelProps> = ({ onGoBackToWelcome }) => {
  const { 
    estadisticasGenerales, 
    error
  } = useSicop();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'instituciones' | 'analysis' | 'reports' | 'categorias'>('dashboard');

  // ================================
  // RENDERIZADO
  // ================================

  return (
    <div className="demo-panel-container">
      {/* Modern Header */}
      <div className="modern-header">
        <div className="header-background">
          <div className="header-pattern"></div>
          <div className="header-orb header-orb-1"></div>
          <div className="header-orb header-orb-2"></div>
        </div>
        
        <div className="header-content">
          <div className="header-logo-section">
            <img 
              src={`${process.env.PUBLIC_URL}/logo-hq-analytics.png`}
              alt="HQ Analytics Logo" 
              className="header-logo"
            />
            <div className="header-company-info">
              <div className="company-name">Saenz Fallas S.A.</div>
              <div className="company-tagline">HQ Analytics™ - High Technology Quality Analytics</div>
            </div>
          </div>
          
          <h1 className="header-title">
            <span className="header-icon">🏛️</span>
            <span className="header-title-text">SICOP Analytics - Sistema de Análisis</span>
          </h1>
          <p className="header-subtitle">
            <span>Análisis Inteligente de Licitaciones Públicas de Costa Rica</span>
            <span className="stat-badge">
              📋 <span className="stat-number">{estadisticasGenerales.carteles?.toLocaleString()}</span> Carteles
            </span>
            <span className="stat-badge">
              📄 <span className="stat-number">{estadisticasGenerales.contratos?.toLocaleString()}</span> Contratos
            </span>
          </p>
          
          {/* Botón de regreso al menú principal */}
          {onGoBackToWelcome && (
            <button 
              className="back-to-welcome-button"
              onClick={onGoBackToWelcome}
              title="Volver al Menú Principal"
            >
              <span className="back-icon">🏠</span>
              <span className="back-text">Menú Principal</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Modern Navigation Tabs */}
      <div className="modern-tabs-container">
        <div className="modern-tabs">
          <button 
            className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="tab-button-content">
              <span className="tab-icon">📊</span>
              <span>Dashboard</span>
            </div>
          </button>

          <button 
            className={`tab-button ${activeTab === 'instituciones' ? 'active' : ''}`}
            onClick={() => setActiveTab('instituciones')}
          >
            <div className="tab-button-content">
              <span className="tab-icon">🏢</span>
              <span>Instituciones</span>
            </div>
          </button>

          <button 
            className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`}
            onClick={() => setActiveTab('analysis')}
          >
            <div className="tab-button-content">
              <span className="tab-icon">🔍</span>
              <span>SICOP</span>
            </div>
          </button>

          <button 
            className={`tab-button ${activeTab === 'categorias' ? 'active' : ''}`}
            onClick={() => setActiveTab('categorias')}
          >
            <div className="tab-button-content">
              <span className="tab-icon">🏷️</span>
              <span>Categorías</span>
            </div>
          </button>

          <button 
            className={`tab-button ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <div className="tab-button-content">
              <span className="tab-icon">📋</span>
              <span>Reportes</span>
            </div>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'dashboard' && (
          <ModernDashboard />
        )}

        {activeTab === 'instituciones' && (
          <div>
            <h2>🏢 Dashboard por Institución</h2>
            <InstitucionesDashboard />
          </div>
        )}

        {activeTab === 'analysis' && (
          <div>
            <h2>🔍 Búsqueda Específica por SICOP</h2>
            <SicopExplorer />
          </div>
        )}

        {activeTab === 'categorias' && (
          <CategoryManager />
        )}

        {activeTab === 'reports' && (
          <ReportsPanel />
        )}
      </div>

      {/* Footer with Copyright */}
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-logo-section">
            <img 
              src={`${process.env.PUBLIC_URL}/logo-hq-analytics.png`}
              alt="HQ Analytics Logo" 
              className="footer-logo"
            />
            <div className="footer-company">
              <strong>Saenz Fallas S.A.</strong>
              <span>HQ Analytics™</span>
            </div>
          </div>
          
          <div className="footer-info">
            <p className="copyright">
              © 2025 Saenz Fallas S.A. - Todos los derechos reservados
            </p>
            <p className="footer-tagline">
              High Technology Quality Analytics - Innovación en Análisis de Datos
            </p>
          </div>

          <div className="footer-links">
            <span className="footer-version">v1.0.0</span>
            <span className="footer-separator">•</span>
            <span>SICOP Analytics</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Export default para lazy loading
export default DemoPanel;
