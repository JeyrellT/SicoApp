// ================================
// ANÁLISIS DE COMPETENCIA DETALLADO
// ================================
// Ranking de proveedores y análisis competitivo

import React, { useMemo } from 'react';
import { dataManager } from '../../data/DataManager';
import _ from 'lodash';

interface CompetenceAnalysisReportProps {
  filters: {
    periodo: { inicio: Date; fin: Date };
    sectores: string[];
    incluirOportunidades: boolean;
  };
}

const CompetenceAnalysisReport: React.FC<CompetenceAnalysisReportProps> = ({ filters }) => {
  
  // Ranking de proveedores
  const rankingProveedores = useMemo(() => {
    const contratos = dataManager.obtenerDatos('Contratos')
      .filter(c => c.fechaFirma && c.fechaFirma >= filters.periodo.inicio && c.fechaFirma <= filters.periodo.fin);
    
    const ofertas = dataManager.obtenerDatos('Ofertas');
    const proveedoresData = dataManager.obtenerDatos('Proveedores');

    const porProveedor = _.groupBy(contratos, 'idProveedor');
    
    const montoTotal = _.sumBy(contratos, 'montoContrato') || 1;

    const ranking = _.map(porProveedor, (contratosProveedor, idProveedor) => {
      const proveedor = proveedoresData.find(p => p.idProveedor === idProveedor);
      const ofertasProveedor = ofertas.filter(o => o.idProveedor === idProveedor);
      const montoProveedor = _.sumBy(contratosProveedor, 'montoContrato') || 0;
      
      return {
        id: idProveedor,
        nombre: proveedor?.nombreProveedor || 'Desconocido',
        cantidadContratos: contratosProveedor.length,
        montoTotal: montoProveedor,
        montoPromedio: montoProveedor / contratosProveedor.length,
        marketShare: (montoProveedor / montoTotal) * 100,
        tasaExito: ofertasProveedor.length > 0 ? (contratosProveedor.length / ofertasProveedor.length) * 100 : 0,
        totalOfertas: ofertasProveedor.length
      };
    })
    .sort((a, b) => b.montoTotal - a.montoTotal)
    .slice(0, 50); // Top 50 proveedores

    return ranking;
  }, [filters]);

  // Análisis de concentración de mercado
  const concentracionMercado = useMemo(() => {
    const montoTotal = _.sumBy(rankingProveedores, 'montoTotal') || 1;
    
    const top3 = _.take(rankingProveedores, 3);
    const top5 = _.take(rankingProveedores, 5);
    const top10 = _.take(rankingProveedores, 10);

    return {
      top3: (_.sumBy(top3, 'montoTotal') / montoTotal) * 100,
      top5: (_.sumBy(top5, 'montoTotal') / montoTotal) * 100,
      top10: (_.sumBy(top10, 'montoTotal') / montoTotal) * 100
    };
  }, [rankingProveedores]);

  // Segmentación de proveedores
  const segmentacion = useMemo(() => {
    const grandes = rankingProveedores.filter(p => p.montoTotal >= 100000000); // >100M
    const medianos = rankingProveedores.filter(p => p.montoTotal >= 10000000 && p.montoTotal < 100000000); // 10M-100M
    const pequeños = rankingProveedores.filter(p => p.montoTotal < 10000000); // <10M

    return {
      grandes: {
        cantidad: grandes.length,
        montoTotal: _.sumBy(grandes, 'montoTotal'),
        promedio: grandes.length > 0 ? _.sumBy(grandes, 'montoTotal') / grandes.length : 0
      },
      medianos: {
        cantidad: medianos.length,
        montoTotal: _.sumBy(medianos, 'montoTotal'),
        promedio: medianos.length > 0 ? _.sumBy(medianos, 'montoTotal') / medianos.length : 0
      },
      pequeños: {
        cantidad: pequeños.length,
        montoTotal: _.sumBy(pequeños, 'montoTotal'),
        promedio: pequeños.length > 0 ? _.sumBy(pequeños, 'montoTotal') / pequeños.length : 0
      }
    };
  }, [rankingProveedores]);

  return (
    <div className="competence-analysis-report">
      <h2 className="report-title">🏢 Análisis de Competencia Detallado</h2>
      
      {/* Métricas de concentración */}
      <div className="report-section">
        <h3>📊 Concentración del Mercado</h3>
        <div className="concentration-metrics">
          <div className="concentration-card">
            <div className="concentration-label">Top 3 Proveedores</div>
            <div className="concentration-value">{concentracionMercado.top3.toFixed(1)}%</div>
            <div className="concentration-description">del mercado total</div>
          </div>
          <div className="concentration-card">
            <div className="concentration-label">Top 5 Proveedores</div>
            <div className="concentration-value">{concentracionMercado.top5.toFixed(1)}%</div>
            <div className="concentration-description">del mercado total</div>
          </div>
          <div className="concentration-card">
            <div className="concentration-label">Top 10 Proveedores</div>
            <div className="concentration-value">{concentracionMercado.top10.toFixed(1)}%</div>
            <div className="concentration-description">del mercado total</div>
          </div>
        </div>
        
        <div className="concentration-interpretation">
          {concentracionMercado.top5 > 60 ? (
            <div className="alert warning">
              ⚠️ Mercado altamente concentrado - Alta barrera de entrada
            </div>
          ) : concentracionMercado.top5 > 40 ? (
            <div className="alert info">
              ℹ️ Mercado moderadamente concentrado - Competencia significativa
            </div>
          ) : (
            <div className="alert success">
              ✅ Mercado fragmentado - Múltiples oportunidades de entrada
            </div>
          )}
        </div>
      </div>

      {/* Segmentación de proveedores */}
      <div className="report-section">
        <h3>📈 Segmentación de Proveedores</h3>
        <div className="segmentation-grid">
          <div className="segment-card large">
            <div className="segment-header">
              <div className="segment-icon">🏆</div>
              <div className="segment-title">Grandes</div>
            </div>
            <div className="segment-metric">
              <div className="segment-label">Cantidad</div>
              <div className="segment-value">{segmentacion.grandes.cantidad}</div>
            </div>
            <div className="segment-metric">
              <div className="segment-label">Monto Total</div>
              <div className="segment-value">₡{(segmentacion.grandes.montoTotal / 1000000).toFixed(1)}M</div>
            </div>
            <div className="segment-metric">
              <div className="segment-label">Promedio</div>
              <div className="segment-value">₡{(segmentacion.grandes.promedio / 1000000).toFixed(1)}M</div>
            </div>
          </div>

          <div className="segment-card medium">
            <div className="segment-header">
              <div className="segment-icon">🥈</div>
              <div className="segment-title">Medianos</div>
            </div>
            <div className="segment-metric">
              <div className="segment-label">Cantidad</div>
              <div className="segment-value">{segmentacion.medianos.cantidad}</div>
            </div>
            <div className="segment-metric">
              <div className="segment-label">Monto Total</div>
              <div className="segment-value">₡{(segmentacion.medianos.montoTotal / 1000000).toFixed(1)}M</div>
            </div>
            <div className="segment-metric">
              <div className="segment-label">Promedio</div>
              <div className="segment-value">₡{(segmentacion.medianos.promedio / 1000000).toFixed(1)}M</div>
            </div>
          </div>

          <div className="segment-card small">
            <div className="segment-header">
              <div className="segment-icon">🥉</div>
              <div className="segment-title">Pequeños</div>
            </div>
            <div className="segment-metric">
              <div className="segment-label">Cantidad</div>
              <div className="segment-value">{segmentacion.pequeños.cantidad}</div>
            </div>
            <div className="segment-metric">
              <div className="segment-label">Monto Total</div>
              <div className="segment-value">₡{(segmentacion.pequeños.montoTotal / 1000000).toFixed(1)}M</div>
            </div>
            <div className="segment-metric">
              <div className="segment-label">Promedio</div>
              <div className="segment-value">₡{(segmentacion.pequeños.promedio / 1000000).toFixed(1)}M</div>
            </div>
          </div>
        </div>
      </div>

      {/* Ranking de proveedores */}
      <div className="report-section">
        <h3>🏅 Ranking de Proveedores (Top 20)</h3>
        <div className="ranking-table">
          <div className="ranking-header">
            <div className="rank-col">#</div>
            <div className="name-col">Proveedor</div>
            <div className="contracts-col">Contratos</div>
            <div className="amount-col">Monto Total</div>
            <div className="share-col">Market Share</div>
            <div className="success-col">Tasa Éxito</div>
          </div>
          
          {rankingProveedores.slice(0, 20).map((proveedor, index) => (
            <div key={proveedor.id} className="ranking-row">
              <div className="rank-col">
                <div className={`rank-badge rank-${index < 3 ? index + 1 : 'other'}`}>
                  {index + 1}
                </div>
              </div>
              <div className="name-col">
                <div className="provider-name">{proveedor.nombre}</div>
                <div className="provider-id">{proveedor.id}</div>
              </div>
              <div className="contracts-col">{proveedor.cantidadContratos}</div>
              <div className="amount-col">
                <div className="amount-main">₡{(proveedor.montoTotal / 1000000).toFixed(2)}M</div>
                <div className="amount-avg">Prom: ₡{(proveedor.montoPromedio / 1000).toFixed(0)}K</div>
              </div>
              <div className="share-col">
                <div className="share-bar">
                  <div 
                    className="share-fill" 
                    style={{ width: `${Math.min(proveedor.marketShare * 10, 100)}%` }}
                  />
                  <span className="share-text">{proveedor.marketShare.toFixed(2)}%</span>
                </div>
              </div>
              <div className="success-col">
                <div className={`success-badge ${proveedor.tasaExito >= 50 ? 'high' : proveedor.tasaExito >= 25 ? 'medium' : 'low'}`}>
                  {proveedor.tasaExito.toFixed(1)}%
                </div>
                <div className="success-detail">{proveedor.totalOfertas} ofertas</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Análisis competitivo */}
      <div className="report-section insights">
        <h3>💡 Insights Competitivos</h3>
        <div className="insights-grid">
          <div className="insight-card">
            <div className="insight-icon">👑</div>
            <div className="insight-content">
              <div className="insight-title">Líder del Mercado</div>
              <div className="insight-text">
                {rankingProveedores[0]?.nombre} domina con {rankingProveedores[0]?.marketShare.toFixed(2)}% 
                del mercado y {rankingProveedores[0]?.cantidadContratos} contratos
              </div>
            </div>
          </div>

          <div className="insight-card">
            <div className="insight-icon">🎯</div>
            <div className="insight-content">
              <div className="insight-title">Mayor Eficiencia</div>
              <div className="insight-text">
                {rankingProveedores.reduce((max, p) => p.tasaExito > max.tasaExito ? p : max, rankingProveedores[0])?.nombre}
                {' '}tiene la mayor tasa de éxito con{' '}
                {rankingProveedores.reduce((max, p) => p.tasaExito > max.tasaExito ? p : max, rankingProveedores[0])?.tasaExito.toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="insight-card">
            <div className="insight-icon">💼</div>
            <div className="insight-content">
              <div className="insight-title">Mayor Actividad</div>
              <div className="insight-text">
                {rankingProveedores.reduce((max, p) => p.cantidadContratos > max.cantidadContratos ? p : max, rankingProveedores[0])?.nombre}
                {' '}es el más activo con{' '}
                {rankingProveedores.reduce((max, p) => p.cantidadContratos > max.cantidadContratos ? p : max, rankingProveedores[0])?.cantidadContratos} contratos
              </div>
            </div>
          </div>

          <div className="insight-card">
            <div className="insight-icon">📊</div>
            <div className="insight-content">
              <div className="insight-title">Diversidad del Mercado</div>
              <div className="insight-text">
                {rankingProveedores.length} proveedores activos compiten en el período analizado
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompetenceAnalysisReport;
