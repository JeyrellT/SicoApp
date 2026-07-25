// ================================
// PANEL DE GENERACIÓN DE REPORTES
// ================================
// Sistema completo de reportes ejecutivos y análisis

import React, { useState, useMemo } from 'react';
import { reportService } from '../services/ReportService';
import { dataManager } from '../data/DataManager';
import './ReportsPanel.css';

// Importar sub-componentes de reportes
import SectorMarketReport from './reports/SectorMarketReport';
import CompetenceAnalysisReport from './reports/CompetenceAnalysisReport';
import PriceTrendsReport from './reports/PriceTrendsReport';
import OpportunitiesReport from './reports/OpportunitiesReport';
import PerformanceMetricsReport from './reports/PerformanceMetricsReport';

type ReportType = 'executive' | 'sector' | 'competence' | 'prices' | 'opportunities' | 'performance';

interface ReportFilter {
  periodo: { inicio: Date; fin: Date };
  sectores: string[];
  categorias: string[]; // Categorías manuales
  incluirOportunidades: boolean;
}

export const ReportsPanel: React.FC = () => {
  const [activeReport, setActiveReport] = useState<ReportType>('executive');
  const [filters, setFilters] = useState<ReportFilter>({
    periodo: {
      inicio: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
      fin: new Date()
    },
    sectores: [],
    categorias: [],
    incluirOportunidades: true
  });

  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'json'>('pdf');

  // Generar reporte ejecutivo
  const reporteEjecutivo = useMemo(() => {
    try {
      return reportService.generarReporteEjecutivo({
        periodo: filters.periodo,
        sectores: filters.sectores.length > 0 ? filters.sectores : undefined,
        incluirOportunidades: filters.incluirOportunidades
      });
    } catch (error) {
      console.error('Error generando reporte ejecutivo:', error);
      return null;
    }
  }, [filters]);

  // Menú de reportes disponibles
  const reportesDisponibles = [
    { 
      id: 'executive' as ReportType, 
      icon: '📊', 
      titulo: 'Resumen Ejecutivo', 
      descripcion: 'Vista general del mercado' 
    },
    { 
      id: 'sector' as ReportType, 
      icon: '🏭', 
      titulo: 'Análisis por Sector', 
      descripcion: 'Desglose detallado por industria' 
    },
    { 
      id: 'competence' as ReportType, 
      icon: '🏢', 
      titulo: 'Competencia', 
      descripcion: 'Ranking y cuota de mercado' 
    },
    { 
      id: 'prices' as ReportType, 
      icon: '💰', 
      titulo: 'Tendencias de Precios', 
      descripcion: 'Histórico y proyecciones' 
    },
    { 
      id: 'opportunities' as ReportType, 
      icon: '🎯', 
      titulo: 'Oportunidades', 
      descripcion: 'Nichos y mercados emergentes' 
    },
    { 
      id: 'performance' as ReportType, 
      icon: '📈', 
      titulo: 'Métricas de Desempeño', 
      descripcion: 'KPIs y benchmarking' 
    }
  ];

  // Sectores disponibles para filtrar
  const sectoresDisponibles = [
    'medicamentos', 'salud', 'educación', 'tecnología', 'construcción',
    'transporte', 'seguridad', 'alimentos', 'servicios', 'consultoría'
  ];

  // Categorías manuales disponibles (obtenerlas del DataManager)
  const categoriasDisponibles = useMemo(() => {
    try {
      return dataManager.getManualCategoryNames();
    } catch (error) {
      console.error('Error obteniendo categorías manuales:', error);
      return [];
    }
  }, []);

  const handleExportReport = () => {
    // TODO: Implementar exportación real
    alert(`Exportando reporte en formato ${exportFormat.toUpperCase()}...`);
  };

  const handleToggleSector = (sector: string) => {
    setFilters(prev => ({
      ...prev,
      sectores: prev.sectores.includes(sector)
        ? prev.sectores.filter(s => s !== sector)
        : [...prev.sectores, sector]
    }));
  };

  const handleToggleCategoria = (categoria: string) => {
    setFilters(prev => ({
      ...prev,
      categorias: prev.categorias.includes(categoria)
        ? prev.categorias.filter(c => c !== categoria)
        : [...prev.categorias, categoria]
    }));
  };

  // ================================
  // RENDERIZADO DE RESUMEN EJECUTIVO
  // ================================

  const renderExecutiveReport = () => {
    if (!reporteEjecutivo) {
      return <div className="report-error">Error al generar el reporte ejecutivo</div>;
    }

    const { resumenGeneral, tendenciasMercado, analisisCompetencia } = reporteEjecutivo;

    return (
      <div className="executive-report">
        <h2 className="report-title">📊 Resumen Ejecutivo</h2>
        
        {/* Métricas principales */}
        <div className="metrics-grid">
          <div className="metric-card primary">
            <div className="metric-icon">📋</div>
            <div className="metric-content">
              <div className="metric-value">{resumenGeneral.totalLicitaciones.toLocaleString()}</div>
              <div className="metric-label">Licitaciones</div>
            </div>
          </div>

          <div className="metric-card success">
            <div className="metric-icon">📝</div>
            <div className="metric-content">
              <div className="metric-value">{resumenGeneral.totalContratos.toLocaleString()}</div>
              <div className="metric-label">Contratos</div>
            </div>
          </div>

          <div className="metric-card warning">
            <div className="metric-icon">💰</div>
            <div className="metric-content">
              <div className="metric-value">
                ₡{(resumenGeneral.montoTotalAdjudicado / 1000000).toFixed(1)}M
              </div>
              <div className="metric-label">Monto Total</div>
            </div>
          </div>

          <div className="metric-card info">
            <div className="metric-icon">📈</div>
            <div className="metric-content">
              <div className="metric-value">
                {resumenGeneral.crecimientoAnual > 0 ? '+' : ''}
                {/* Limitar a máximo ±999% para evitar números gigantes */}
                {Math.min(Math.max(resumenGeneral.crecimientoAnual, -999), 999).toFixed(1)}%
              </div>
              <div className="metric-label">Crecimiento Anual</div>
            </div>
          </div>
        </div>

        {/* Instituciones más activas */}
        <div className="report-section">
          <h3>🏛️ Instituciones Más Activas</h3>
          <div className="institutions-list">
            {resumenGeneral.institucionesMasActivas.slice(0, 5).map((inst, index) => (
              <div key={index} className="institution-item">
                <div className="institution-rank">#{index + 1}</div>
                <div className="institution-info">
                  <div className="institution-name">{inst.nombre}</div>
                  <div className="institution-stats">
                    {inst.cantidad} licitaciones • ₡{(inst.monto / 1000000).toFixed(1)}M
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sectores principales */}
        <div className="report-section">
          <h3>🏭 Sectores Principales</h3>
          <div className="sectors-chart">
            {resumenGeneral.sectoresPrincipales.map((sector, index) => (
              <div key={index} className="sector-bar">
                <div className="sector-label">{sector.sector}</div>
                <div className="sector-progress">
                  <div 
                    className="sector-fill" 
                    style={{ width: `${sector.participacion}%` }}
                  />
                  <span className="sector-percentage">{sector.participacion.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tendencias de mercado */}
        <div className="report-section">
          <h3>📊 Indicadores del Mercado</h3>
          <div className="market-indicators">
            <div className="indicator">
              <div className="indicator-icon">🎯</div>
              <div className="indicator-label">Competencia Promedio</div>
              <div className="indicator-value">
                {tendenciasMercado.competenciaPromedio.toFixed(1)} ofertas/línea
              </div>
            </div>

            <div className="indicator">
              <div className="indicator-icon">⏱️</div>
              <div className="indicator-label">Tiempo Promedio</div>
              <div className="indicator-value">
                {tendenciasMercado.tiempoPromedioProceso.toFixed(0)} días
              </div>
            </div>

            <div className="indicator">
              <div className="indicator-icon">🏆</div>
              <div className="indicator-label">Concentración Top 5</div>
              <div className="indicator-value">
                {analisisCompetencia.concentracionMercado.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Recomendaciones */}
        {reporteEjecutivo.recomendaciones.length > 0 && (
          <div className="report-section recommendations">
            <h3>💡 Recomendaciones Estratégicas</h3>
            <ul className="recommendations-list">
              {reporteEjecutivo.recomendaciones.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  // ================================
  // RENDERIZADO PRINCIPAL
  // ================================

  return (
    <div className="reports-panel">
      {/* Header con controles */}
      <div className="reports-header">
        <div className="reports-title">
          <h1>📋 Generación de Reportes Ejecutivos</h1>
          <p>Análisis avanzado y reportes personalizados</p>
        </div>

        <div className="reports-actions">
          <select 
            className="export-format-select"
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as any)}
          >
            <option value="pdf">📄 PDF</option>
            <option value="excel">📊 Excel</option>
            <option value="json">📋 JSON</option>
          </select>
          
          <button className="export-button" onClick={handleExportReport}>
            💾 Exportar Reporte
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="reports-filters">
        <div className="filter-group">
          <label>📅 Período:</label>
          <input 
            type="date" 
            value={filters.periodo.inicio.toISOString().split('T')[0]}
            onChange={(e) => setFilters(prev => ({
              ...prev,
              periodo: { ...prev.periodo, inicio: new Date(e.target.value) }
            }))}
          />
          <span>a</span>
          <input 
            type="date" 
            value={filters.periodo.fin.toISOString().split('T')[0]}
            onChange={(e) => setFilters(prev => ({
              ...prev,
              periodo: { ...prev.periodo, fin: new Date(e.target.value) }
            }))}
          />
        </div>

        <div className="filter-group">
          <label>🏭 Sectores:</label>
          <div className="sectors-filter">
            {sectoresDisponibles.map(sector => (
              <button
                key={sector}
                className={`sector-tag ${filters.sectores.includes(sector) ? 'active' : ''}`}
                onClick={() => handleToggleSector(sector)}
              >
                {sector}
              </button>
            ))}
          </div>
        </div>

        {/* Filtro de categorías manuales */}
        {categoriasDisponibles.length > 0 && (
          <div className="filter-group">
            <label>🏷️ Categorías Personalizadas:</label>
            <div className="sectors-filter">
              {categoriasDisponibles.map(categoria => (
                <button
                  key={categoria}
                  className={`sector-tag ${filters.categorias.includes(categoria) ? 'active' : ''}`}
                  onClick={() => handleToggleCategoria(categoria)}
                >
                  {categoria}
                </button>
              ))}
            </div>
            {filters.categorias.length > 0 && (
              <div className="filter-info">
                ℹ️ Filtrando por {filters.categorias.length} categoría{filters.categorias.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Menú de navegación de reportes */}
      <div className="reports-menu">
        {reportesDisponibles.map(reporte => (
          <button
            key={reporte.id}
            className={`report-menu-item ${activeReport === reporte.id ? 'active' : ''}`}
            onClick={() => setActiveReport(reporte.id)}
          >
            <div className="menu-item-icon">{reporte.icon}</div>
            <div className="menu-item-content">
              <div className="menu-item-title">{reporte.titulo}</div>
              <div className="menu-item-description">{reporte.descripcion}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Contenido del reporte activo */}
      <div className="reports-content">
        {activeReport === 'executive' && renderExecutiveReport()}
        {activeReport === 'sector' && <SectorMarketReport filters={filters} />}
        {activeReport === 'competence' && <CompetenceAnalysisReport filters={filters} />}
        {activeReport === 'prices' && <PriceTrendsReport filters={filters} />}
        {activeReport === 'opportunities' && <OpportunitiesReport filters={filters} />}
        {activeReport === 'performance' && <PerformanceMetricsReport filters={filters} />}
      </div>
    </div>
  );
};

export default ReportsPanel;
