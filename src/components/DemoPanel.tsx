/**
 * SICOP Analytics - Sistema de Análisis de Contrataciones Públicas
 * Panel Principal de Demostración
 * 
 * @copyright 2025 Saenz Fallas S.A. - Todos los derechos reservados
 * @author Saenz Fallas S.A.
 * @company Saenz Fallas S.A.
 * @license Propiedad de Saenz Fallas S.A.
 * 
 * HQ Analytics™ - High Technology Quality Analytics
 */

// ================================
// PANEL DE DEMOSTRACIÓN PRINCIPAL
// ================================
// Muestra las funcionalidades principales del sistema

import React, { useState } from 'react';
import { useSicop } from '../context/SicopContext';
import { FiltroBusqueda } from '../types/entities';
import ModernDashboard from './ModernDashboard';
import InstitucionesDashboard from './InstitucionesDashboard';
import SicopExplorer from './SicopExplorer';
import CategoryManager from './CategoryManager/CategoryManager';
import ReportsPanel from './ReportsPanel';

export const DemoPanel: React.FC = () => {
  const { 
    estadisticasGenerales, 
    error
  } = useSicop();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'instituciones' | 'analysis' | 'reports' | 'categorias'>('dashboard');

  // ================================
  // ESTILOS
  // ================================

  const tabStyle = (isActive: boolean) => ({
    padding: '10px 20px',
    backgroundColor: isActive ? '#3498db' : '#ecf0f1',
    color: isActive ? 'white' : '#2c3e50',
    border: 'none',
    cursor: 'pointer',
    borderRadius: '4px 4px 0 0',
    marginRight: '2px'
  });

  const cardStyle = {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  };

  // ================================
  // RENDERIZADO
  // ================================

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f5f5',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <h1 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>
          🏛️ SICOP Analytics - Panel de Demostración
        </h1>
        <p style={{ margin: 0, color: '#666' }}>
          Análisis de Licitaciones Públicas • {estadisticasGenerales.carteles?.toLocaleString()} Carteles • 
          {estadisticasGenerales.contratos?.toLocaleString()} Contratos
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          ...cardStyle,
          backgroundColor: '#ffebee',
          border: '1px solid #e74c3c',
          color: '#c0392b'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          style={tabStyle(activeTab === 'dashboard')}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button 
          style={tabStyle(activeTab === 'instituciones')}
          onClick={() => setActiveTab('instituciones')}
        >
          🏢 Instituciones
        </button>
        <button 
          style={tabStyle(activeTab === 'analysis')}
          onClick={() => setActiveTab('analysis')}
        >
          � SICOP
        </button>
        <button 
          style={tabStyle(activeTab === 'categorias')}
          onClick={() => setActiveTab('categorias')}
        >
          🏷️ Categorías
        </button>
        <button 
          style={tabStyle(activeTab === 'reports')}
          onClick={() => setActiveTab('reports')}
        >
          📋 Reportes
        </button>
      </div>

      {/* Tab Content */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '0 8px 8px 8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        minHeight: '400px'
      }}>
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
            <h2>� Búsqueda Específica por SICOP</h2>
            <SicopExplorer />
          </div>
        )}

        {activeTab === 'categorias' && (
          <div>
            <h2>🏷️ Gestión de Categorías</h2>
            <CategoryManager />
          </div>
        )}

        {activeTab === 'reports' && (
          <ReportsPanel />
        )}
      </div>
    </div>
  );
};
