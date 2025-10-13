// ================================
// REPORTE DE MERCADO POR SECTOR
// ================================
// Análisis detallado de sectores específicos

import React, { useMemo } from 'react';
import { dataManager } from '../../data/DataManager';
import _ from 'lodash';

interface SectorMarketReportProps {
  filters: {
    periodo: { inicio: Date; fin: Date };
    sectores: string[];
    incluirOportunidades: boolean;
  };
}

const SectorMarketReport: React.FC<SectorMarketReportProps> = ({ filters }) => {
  
  // Análisis de datos por sector
  const analisisSectores = useMemo(() => {
    const carteles = dataManager.obtenerDatos('DetalleCarteles')
      .filter(c => c.fechaPublicacion && c.fechaPublicacion >= filters.periodo.inicio && c.fechaPublicacion <= filters.periodo.fin);
    
    const contratos = dataManager.obtenerDatos('Contratos')
      .filter(c => c.fechaFirma && c.fechaFirma >= filters.periodo.inicio && c.fechaFirma <= filters.periodo.fin);

    const sectoresAnalizar = filters.sectores.length > 0 ? filters.sectores : [
      'medicamentos', 'salud', 'educación', 'tecnología', 'construcción',
      'transporte', 'seguridad', 'alimentos', 'servicios', 'consultoría'
    ];

    return sectoresAnalizar.map(sector => {
      const cartelesDelSector = carteles.filter(c => {
        const texto = `${c.nombreCartel || ''} ${c.descripcionCartel || ''}`.toLowerCase();
        return texto.includes(sector.toLowerCase());
      });

      // Mejorar filtrado de contratos: buscar en múltiples fuentes
      const contratosDelSector = contratos.filter(contrato => {
        // 1. Buscar en el cartel asociado al contrato
        const cartelAsociado = carteles.find(c => c.numeroCartel === contrato.numeroCartel);
        if (cartelAsociado) {
          const textoCartel = `${cartelAsociado.nombreCartel || ''} ${cartelAsociado.descripcionCartel || ''}`.toLowerCase();
          if (textoCartel.includes(sector.toLowerCase())) return true;
        }

        // 2. Buscar en descripción del contrato si existe
        if (contrato.descripcionContrato) {
          const textoContrato = contrato.descripcionContrato.toLowerCase();
          if (textoContrato.includes(sector.toLowerCase())) return true;
        }

        // 3. Buscar en líneas contratadas para determinar el sector
        const lineasContratadas = dataManager.obtenerDatos('LineasContratadas')
          .filter(lc => lc.idContrato === contrato.idContrato);
        
        if (lineasContratadas.length > 0) {
          return lineasContratadas.some(lc => {
            // Buscar en descripción de la línea contratada
            if (lc.descripcionLinea) {
              const textoLinea = lc.descripcionLinea.toLowerCase();
              if (textoLinea.includes(sector.toLowerCase())) return true;
            }

            // Buscar en detalle de línea de cartel
            const lineaCartel = dataManager.obtenerDatos('DetalleLineaCartel')
              .find(dlc => dlc.numeroCartel === lc.numeroCartel && dlc.numeroLinea === lc.numeroLinea);
            
            if (lineaCartel && lineaCartel.descripcionLinea) {
              const textoLineaCartel = lineaCartel.descripcionLinea.toLowerCase();
              return textoLineaCartel.includes(sector.toLowerCase());
            }

            return false;
          });
        }

        return false;
      });

      // Calcular montos usando método preciso
      const montoTotal = _.sumBy(contratosDelSector, (c: any) => dataManager.obtenerMontoContratoPreciso(c)) || 0;
      const montoPromedio = contratosDelSector.length > 0 ? montoTotal / contratosDelSector.length : 0;

      // Calcular proveedores activos
      const proveedoresActivos = _.uniqBy(contratosDelSector, 'idProveedor').length;

      // Calcular tasa de adjudicación
      const lineasPublicadas = cartelesDelSector.reduce((sum, c) => sum + (c.cantidadLineas || 0), 0);
      const lineasAdjudicadas = contratosDelSector.length;
      const tasaAdjudicacion = lineasPublicadas > 0 ? (lineasAdjudicadas / lineasPublicadas) * 100 : 0;

      // Tendencia (comparar con período anterior)
      const inicioAnterior = new Date(filters.periodo.inicio);
      inicioAnterior.setFullYear(inicioAnterior.getFullYear() - 1);
      const finAnterior = new Date(filters.periodo.fin);
      finAnterior.setFullYear(finAnterior.getFullYear() - 1);

      const contratosAnterior = contratos.filter(c => {
        const fecha = c.fechaFirma;
        if (!fecha) return false;
        return fecha >= inicioAnterior && fecha <= finAnterior;
      }).filter(contrato => {
        const lineasContratadas = dataManager.obtenerDatos('LineasContratadas')
          .filter(lc => lc.idContrato === contrato.idContrato);
        
        return lineasContratadas.some(lc => {
          const lineaCartel = dataManager.obtenerDatos('DetalleLineaCartel')
            .find(dlc => dlc.numeroCartel === lc.numeroCartel && dlc.numeroLinea === lc.numeroLinea);
          
          if (!lineaCartel) return false;
          return lineaCartel.descripcionLinea.toLowerCase().includes(sector.toLowerCase());
        });
      });

      // Calcular monto anterior usando método preciso
      const montoAnterior = _.sumBy(contratosAnterior, (c: any) => dataManager.obtenerMontoContratoPreciso(c)) || 1;
      const tendencia = montoAnterior > 0 ? ((montoTotal - montoAnterior) / montoAnterior) * 100 : 0;

      return {
        sector,
        totalLicitaciones: cartelesDelSector.length,
        totalContratos: contratosDelSector.length,
        montoTotal,
        montoPromedio,
        proveedoresActivos,
        tasaAdjudicacion,
        tendencia
      };
    }).sort((a, b) => b.montoTotal - a.montoTotal);
  }, [filters]);

  const montoTotalGlobal = useMemo(() => 
    _.sumBy(analisisSectores, 'montoTotal'), 
    [analisisSectores]
  );

  return (
    <div className="sector-market-report">
      <h2 className="report-title">🏭 Análisis de Mercado por Sector</h2>
      
      <div className="report-intro">
        <p>
          Análisis detallado de {analisisSectores.length} sectores para el período del{' '}
          {filters.periodo.inicio.toLocaleDateString()} al {filters.periodo.fin.toLocaleDateString()}
        </p>
      </div>

      {/* Resumen de sectores */}
      <div className="sectors-summary">
        {analisisSectores.map((sector, index) => {
          const participacion = montoTotalGlobal > 0 ? (sector.montoTotal / montoTotalGlobal) * 100 : 0;
          
          return (
            <div key={sector.sector} className="sector-card">
              <div className="sector-card-header">
                <div className="sector-rank">#{index + 1}</div>
                <div className="sector-name">{sector.sector.toUpperCase()}</div>
                <div className={`sector-trend ${sector.tendencia >= 0 ? 'positive' : 'negative'}`}>
                  {sector.tendencia >= 0 ? '📈' : '📉'} {Math.abs(sector.tendencia).toFixed(1)}%
                </div>
              </div>

              <div className="sector-metrics">
                <div className="sector-metric">
                  <div className="metric-label">Monto Total</div>
                  <div className="metric-value large">
                    ₡{(sector.montoTotal / 1000000).toFixed(1)}M
                  </div>
                  <div className="metric-detail">
                    {participacion.toFixed(1)}% del total
                  </div>
                </div>

                <div className="sector-metric">
                  <div className="metric-label">Licitaciones</div>
                  <div className="metric-value">{sector.totalLicitaciones}</div>
                </div>

                <div className="sector-metric">
                  <div className="metric-label">Contratos</div>
                  <div className="metric-value">{sector.totalContratos}</div>
                </div>

                <div className="sector-metric">
                  <div className="metric-label">Monto Promedio</div>
                  <div className="metric-value">
                    ₡{(sector.montoPromedio / 1000).toFixed(0)}K
                  </div>
                </div>

                <div className="sector-metric">
                  <div className="metric-label">Proveedores Activos</div>
                  <div className="metric-value">{sector.proveedoresActivos}</div>
                </div>

                <div className="sector-metric">
                  <div className="metric-label">Tasa Adjudicación</div>
                  <div className="metric-value">{sector.tasaAdjudicacion.toFixed(1)}%</div>
                </div>
              </div>

              <div className="sector-visualization">
                <div className="participation-bar">
                  <div 
                    className="participation-fill" 
                    style={{ width: `${participacion}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparativa de sectores */}
      <div className="report-section">
        <h3>📊 Comparativa de Sectores</h3>
        <div className="comparative-chart">
          {analisisSectores.map(sector => (
            <div key={sector.sector} className="comparative-row">
              <div className="comparative-label">{sector.sector}</div>
              <div className="comparative-bars">
                <div className="comparative-bar-container">
                  <div className="bar-label">Licitaciones</div>
                  <div className="bar-wrapper">
                    <div 
                      className="bar licitaciones" 
                      style={{ 
                        width: `${(sector.totalLicitaciones / Math.max(...analisisSectores.map(s => s.totalLicitaciones)) * 100)}%` 
                      }}
                    />
                    <span className="bar-value">{sector.totalLicitaciones}</span>
                  </div>
                </div>
                <div className="comparative-bar-container">
                  <div className="bar-label">Contratos</div>
                  <div className="bar-wrapper">
                    <div 
                      className="bar contratos" 
                      style={{ 
                        width: `${(sector.totalContratos / Math.max(...analisisSectores.map(s => s.totalContratos)) * 100)}%` 
                      }}
                    />
                    <span className="bar-value">{sector.totalContratos}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="report-section insights">
        <h3>💡 Insights del Análisis</h3>
        <div className="insights-grid">
          <div className="insight-card">
            <div className="insight-icon">🏆</div>
            <div className="insight-content">
              <div className="insight-title">Sector Dominante</div>
              <div className="insight-text">
                {analisisSectores[0]?.sector.toUpperCase()} lidera el mercado con 
                ₡{(analisisSectores[0]?.montoTotal / 1000000).toFixed(1)}M en contratos
              </div>
            </div>
          </div>

          <div className="insight-card">
            <div className="insight-icon">📈</div>
            <div className="insight-content">
              <div className="insight-title">Mayor Crecimiento</div>
              <div className="insight-text">
                {analisisSectores.reduce((max, s) => s.tendencia > max.tendencia ? s : max, analisisSectores[0])?.sector.toUpperCase()} 
                {' '}creció {Math.max(...analisisSectores.map(s => s.tendencia)).toFixed(1)}% interanual
              </div>
            </div>
          </div>

          <div className="insight-card">
            <div className="insight-icon">🎯</div>
            <div className="insight-content">
              <div className="insight-title">Mayor Competencia</div>
              <div className="insight-text">
                {analisisSectores.reduce((max, s) => s.proveedoresActivos > max.proveedoresActivos ? s : max, analisisSectores[0])?.sector.toUpperCase()} 
                {' '}tiene {Math.max(...analisisSectores.map(s => s.proveedoresActivos))} proveedores activos
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectorMarketReport;
