// ================================
// MÉTRICAS DE DESEMPEÑO
// ================================
// KPIs y benchmarking de rendimiento

import React, { useMemo } from 'react';
import { dataManager } from '../../data/DataManager';
import _ from 'lodash';

interface PerformanceMetricsReportProps {
  filters: {
    periodo: { inicio: Date; fin: Date };
    sectores: string[];
    incluirOportunidades: boolean;
  };
}

const PerformanceMetricsReport: React.FC<PerformanceMetricsReportProps> = ({ filters }) => {
  
  // Calcular KPIs principales
  const kpis = useMemo(() => {
    const carteles = dataManager.obtenerDatos('DetalleCarteles')
      .filter(c => c.fechaPublicacion && c.fechaPublicacion >= filters.periodo.inicio && c.fechaPublicacion <= filters.periodo.fin);
    
    const contratos = dataManager.obtenerDatos('Contratos')
      .filter(c => c.fechaFirma && c.fechaFirma >= filters.periodo.inicio && c.fechaFirma <= filters.periodo.fin);
    
    const ofertas = dataManager.obtenerDatos('Ofertas');
    const lineasRecibidas = dataManager.obtenerDatos('LineasRecibidas');
    const lineasAdjudicadas = dataManager.obtenerDatos('LineasAdjudicadas');
    const fechasPorEtapas = dataManager.obtenerDatos('FechaPorEtapas');

    // KPI 1: Tasa de adjudicación
    const totalLineasPublicadas = _.sumBy(carteles, 'cantidadLineas') || 1;
    const totalLineasAdjudicadas = lineasAdjudicadas.filter(la => {
      const cartel = carteles.find(c => c.numeroCartel === la.numeroCartel);
      return !!cartel;
    }).length;
    const tasaAdjudicacion = (totalLineasAdjudicadas / totalLineasPublicadas) * 100;

    // KPI 2: Tiempo promedio de proceso
    const tiempos = carteles.map(cartel => {
      const fechas = fechasPorEtapas.find(f => f.numeroCartel === cartel.numeroCartel);
      if (!fechas || !fechas.fechaPublicacion || !fechas.fechaAdjudicacion) return null;
      
      const inicio = new Date(fechas.fechaPublicacion);
      const fin = new Date(fechas.fechaAdjudicacion);
      return (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24); // días
    }).filter((t): t is number => t !== null && t > 0);

    const tiempoPromedio = _.mean(tiempos) || 0;

    // KPI 3: Competencia promedio
    const competenciaPromedio = _.meanBy(lineasRecibidas, 'cantidadOfertasRecibidas') || 0;

    // KPI 4: Monto promedio por contrato
    const montoPromedio = _.meanBy(contratos, 'montoContrato') || 0;

    // KPI 5: Tasa de éxito de proveedores
    const totalOfertas = ofertas.length || 1;
    const tasaExitoGlobal = (contratos.length / totalOfertas) * 100;

    // KPI 6: Concentración de mercado (HHI - Herfindahl-Hirschman Index)
    const porProveedor = _.groupBy(contratos, 'idProveedor');
    const montoTotal = _.sumBy(contratos, 'montoContrato') || 1;
    const hhi = _.sumBy(Object.values(porProveedor), (contratosProveedor) => {
      const marketShare = (_.sumBy(contratosProveedor, 'montoContrato') / montoTotal) * 100;
      return Math.pow(marketShare, 2);
    });

    // KPI 7: Eficiencia de adjudicación
    const lineasConOfertas = lineasRecibidas.filter(lr => lr.cantidadOfertasRecibidas > 0).length;
    const eficienciaAdjudicacion = lineasConOfertas > 0 ? (totalLineasAdjudicadas / lineasConOfertas) * 100 : 0;

    // KPI 8: Variabilidad de precios
    const preciosAdjudicados = lineasAdjudicadas.map(la => la.precioAdjudicado).filter(p => p > 0);
    const desviacionEstandar = preciosAdjudicados.length > 1 ? _.std(preciosAdjudicados) : 0;
    const coeficienteVariacion = _.mean(preciosAdjudicados) ? (desviacionEstandar / _.mean(preciosAdjudicados)) * 100 : 0;

    return {
      tasaAdjudicacion,
      tiempoPromedio,
      competenciaPromedio,
      montoPromedio,
      tasaExitoGlobal,
      hhi,
      eficienciaAdjudicacion,
      coeficienteVariacion,
      totalLicitaciones: carteles.length,
      totalContratos: contratos.length,
      totalOfertas,
      montoTotal: _.sumBy(contratos, 'montoContrato')
    };
  }, [filters]);

  // Benchmarking por institución
  const benchmarkingInstituciones = useMemo(() => {
    const carteles = dataManager.obtenerDatos('DetalleCarteles')
      .filter(c => c.fechaPublicacion && c.fechaPublicacion >= filters.periodo.inicio && c.fechaPublicacion <= filters.periodo.fin);
    
    const contratos = dataManager.obtenerDatos('Contratos')
      .filter(c => c.fechaFirma && c.fechaFirma >= filters.periodo.inicio && c.fechaFirma <= filters.periodo.fin);
    
    const instituciones = dataManager.obtenerDatos('InstitucionesRegistradas');
    const fechasPorEtapas = dataManager.obtenerDatos('FechaPorEtapas');

    const porInstitucion = _.groupBy(carteles, 'codigoInstitucion');

    return _.map(porInstitucion, (cartelesInst, codigo) => {
      const institucion = instituciones.find(i => i.codigoInstitucion === codigo);
      const contratosInst = contratos.filter(c => c.codigoInstitucion === codigo);
      
      const tiempos = cartelesInst.map(cartel => {
        const fechas = fechasPorEtapas.find(f => f.numeroCartel === cartel.numeroCartel);
        if (!fechas || !fechas.fechaPublicacion || !fechas.fechaAdjudicacion) return null;
        
        const inicio = new Date(fechas.fechaPublicacion);
        const fin = new Date(fechas.fechaAdjudicacion);
        return (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24);
      }).filter((t): t is number => t !== null && t > 0);

      return {
        codigo,
        nombre: institucion?.nombreInstitucion || 'Desconocida',
        cantidadLicitaciones: cartelesInst.length,
        cantidadContratos: contratosInst.length,
        montoTotal: _.sumBy(contratosInst, 'montoContrato') || 0,
        tiempoPromedio: _.mean(tiempos) || 0,
        tasaConversion: cartelesInst.length > 0 ? (contratosInst.length / cartelesInst.length) * 100 : 0
      };
    })
    .filter(inst => inst.cantidadLicitaciones >= 5)
    .sort((a, b) => b.montoTotal - a.montoTotal)
    .slice(0, 10);
  }, [filters]);

  // Tendencias temporales
  const tendenciasTemporales = useMemo(() => {
    const contratos = dataManager.obtenerDatos('Contratos')
      .filter(c => c.fechaFirma && c.fechaFirma >= filters.periodo.inicio && c.fechaFirma <= filters.periodo.fin);

    const porMes = _.groupBy(contratos, c => {
      const fecha = c.fechaFirma;
      return fecha ? `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}` : 'Sin fecha';
    });

    return _.map(porMes, (contratosDelMes, periodo) => ({
      periodo,
      cantidad: contratosDelMes.length,
      monto: _.sumBy(contratosDelMes, 'montoContrato') || 0,
      promedio: _.meanBy(contratosDelMes, 'montoContrato') || 0
    }))
    .filter(item => item.periodo !== 'Sin fecha')
    .sort((a, b) => a.periodo.localeCompare(b.periodo));
  }, [filters]);

  // Clasificación de KPIs
  const getKPIStatus = (kpi: string, value: number) => {
    switch (kpi) {
      case 'tasaAdjudicacion':
        return value >= 70 ? 'excelente' : value >= 50 ? 'bueno' : value >= 30 ? 'regular' : 'bajo';
      case 'competenciaPromedio':
        return value >= 5 ? 'excelente' : value >= 3 ? 'bueno' : value >= 2 ? 'regular' : 'bajo';
      case 'tiempoPromedio':
        return value <= 30 ? 'excelente' : value <= 60 ? 'bueno' : value <= 90 ? 'regular' : 'bajo';
      case 'hhi':
        return value < 1500 ? 'excelente' : value < 2500 ? 'bueno' : 'regular';
      default:
        return 'regular';
    }
  };

  return (
    <div className="performance-metrics-report">
      <h2 className="report-title">📈 Métricas de Desempeño</h2>
      
      {/* KPIs Principales */}
      <div className="report-section">
        <h3>📊 Indicadores Clave de Rendimiento (KPIs)</h3>
        <div className="kpis-grid">
          <div className={`kpi-card ${getKPIStatus('tasaAdjudicacion', kpis.tasaAdjudicacion)}`}>
            <div className="kpi-icon">🎯</div>
            <div className="kpi-content">
              <div className="kpi-label">Tasa de Adjudicación</div>
              <div className="kpi-value">{kpis.tasaAdjudicacion.toFixed(1)}%</div>
              <div className="kpi-description">
                {kpis.totalContratos} de {kpis.totalLicitaciones} licitaciones
              </div>
            </div>
          </div>

          <div className={`kpi-card ${getKPIStatus('tiempoPromedio', kpis.tiempoPromedio)}`}>
            <div className="kpi-icon">⏱️</div>
            <div className="kpi-content">
              <div className="kpi-label">Tiempo Promedio</div>
              <div className="kpi-value">{kpis.tiempoPromedio.toFixed(0)} días</div>
              <div className="kpi-description">
                Desde publicación a adjudicación
              </div>
            </div>
          </div>

          <div className={`kpi-card ${getKPIStatus('competenciaPromedio', kpis.competenciaPromedio)}`}>
            <div className="kpi-icon">🏢</div>
            <div className="kpi-content">
              <div className="kpi-label">Competencia Promedio</div>
              <div className="kpi-value">{kpis.competenciaPromedio.toFixed(1)}</div>
              <div className="kpi-description">
                Ofertas por línea
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon">💰</div>
            <div className="kpi-content">
              <div className="kpi-label">Monto Promedio</div>
              <div className="kpi-value">₡{(kpis.montoPromedio / 1000000).toFixed(2)}M</div>
              <div className="kpi-description">
                Por contrato
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon">📈</div>
            <div className="kpi-content">
              <div className="kpi-label">Tasa de Éxito Global</div>
              <div className="kpi-value">{kpis.tasaExitoGlobal.toFixed(1)}%</div>
              <div className="kpi-description">
                Contratos / Ofertas totales
              </div>
            </div>
          </div>

          <div className={`kpi-card ${getKPIStatus('hhi', kpis.hhi)}`}>
            <div className="kpi-icon">📊</div>
            <div className="kpi-content">
              <div className="kpi-label">Índice HHI</div>
              <div className="kpi-value">{kpis.hhi.toFixed(0)}</div>
              <div className="kpi-description">
                {kpis.hhi < 1500 ? 'Mercado competitivo' : kpis.hhi < 2500 ? 'Moderadamente concentrado' : 'Alta concentración'}
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon">✅</div>
            <div className="kpi-content">
              <div className="kpi-label">Eficiencia de Adjudicación</div>
              <div className="kpi-value">{kpis.eficienciaAdjudicacion.toFixed(1)}%</div>
              <div className="kpi-description">
                Líneas con ofertas que se adjudican
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon">📉</div>
            <div className="kpi-content">
              <div className="kpi-label">Variabilidad de Precios</div>
              <div className="kpi-value">{kpis.coeficienteVariacion.toFixed(1)}%</div>
              <div className="kpi-description">
                Coeficiente de variación
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Benchmarking por institución */}
      <div className="report-section">
        <h3>🏛️ Benchmarking por Institución (Top 10)</h3>
        <div className="benchmarking-table">
          <div className="benchmarking-header">
            <div className="inst-col">Institución</div>
            <div className="licit-col">Licitaciones</div>
            <div className="cont-col">Contratos</div>
            <div className="monto-col">Monto Total</div>
            <div className="tiempo-col">Tiempo Prom.</div>
            <div className="conv-col">Tasa Conv.</div>
          </div>

          {benchmarkingInstituciones.map((inst, index) => (
            <div key={inst.codigo} className="benchmarking-row">
              <div className="inst-col">
                <div className="inst-name">{inst.nombre}</div>
                <div className="inst-code">{inst.codigo}</div>
              </div>
              <div className="licit-col">{inst.cantidadLicitaciones}</div>
              <div className="cont-col">{inst.cantidadContratos}</div>
              <div className="monto-col">
                <div className="monto-value">₡{(inst.montoTotal / 1000000).toFixed(1)}M</div>
              </div>
              <div className="tiempo-col">
                <div className={`tiempo-badge ${inst.tiempoPromedio <= 45 ? 'fast' : inst.tiempoPromedio <= 75 ? 'medium' : 'slow'}`}>
                  {inst.tiempoPromedio.toFixed(0)} días
                </div>
              </div>
              <div className="conv-col">
                <div className="conversion-bar">
                  <div 
                    className="conversion-fill" 
                    style={{ width: `${Math.min(inst.tasaConversion, 100)}%` }}
                  />
                  <span className="conversion-text">{inst.tasaConversion.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tendencias temporales */}
      <div className="report-section">
        <h3>📈 Evolución Temporal</h3>
        <div className="temporal-evolution">
          <div className="evolution-chart">
            {tendenciasTemporales.map((punto, index) => {
              const maxMonto = Math.max(...tendenciasTemporales.map(p => p.monto));
              const altura = (punto.monto / maxMonto) * 100;
              
              return (
                <div key={punto.periodo} className="evolution-bar">
                  <div className="bar-container">
                    <div 
                      className="bar-fill" 
                      style={{ height: `${altura}%` }}
                      title={`₡${(punto.monto / 1000000).toFixed(1)}M`}
                    />
                  </div>
                  <div className="bar-stats">
                    <div className="bar-monto">₡{(punto.monto / 1000000).toFixed(1)}M</div>
                    <div className="bar-cantidad">{punto.cantidad} contratos</div>
                  </div>
                  <div className="bar-label">{punto.periodo}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Análisis y recomendaciones */}
      <div className="report-section insights">
        <h3>💡 Análisis de Desempeño</h3>
        <div className="insights-grid">
          <div className={`insight-card ${getKPIStatus('tasaAdjudicacion', kpis.tasaAdjudicacion)}`}>
            <div className="insight-icon">🎯</div>
            <div className="insight-content">
              <div className="insight-title">Eficiencia de Adjudicación</div>
              <div className="insight-text">
                {kpis.tasaAdjudicacion >= 70 ? 
                  'Excelente tasa de adjudicación - Proceso eficiente' :
                  kpis.tasaAdjudicacion >= 50 ?
                  'Tasa de adjudicación aceptable - Margen de mejora' :
                  'Tasa de adjudicación baja - Requiere optimización del proceso'
                }
              </div>
            </div>
          </div>

          <div className={`insight-card ${getKPIStatus('competenciaPromedio', kpis.competenciaPromedio)}`}>
            <div className="insight-icon">🏢</div>
            <div className="insight-content">
              <div className="insight-title">Nivel de Competencia</div>
              <div className="insight-text">
                {kpis.competenciaPromedio >= 5 ?
                  'Alta competencia - Mercado saludable y competitivo' :
                  kpis.competenciaPromedio >= 3 ?
                  'Competencia moderada - Oportunidades disponibles' :
                  'Baja competencia - Posibles barreras de entrada o nichos especializados'
                }
              </div>
            </div>
          </div>

          <div className={`insight-card ${getKPIStatus('tiempoPromedio', kpis.tiempoPromedio)}`}>
            <div className="insight-icon">⏱️</div>
            <div className="insight-content">
              <div className="insight-title">Velocidad de Proceso</div>
              <div className="insight-text">
                {kpis.tiempoPromedio <= 30 ?
                  'Procesos muy ágiles - Tiempo de adjudicación óptimo' :
                  kpis.tiempoPromedio <= 60 ?
                  'Tiempo de proceso aceptable - Dentro de estándares' :
                  'Procesos lentos - Considerar optimización de tiempos'
                }
              </div>
            </div>
          </div>

          <div className={`insight-card ${getKPIStatus('hhi', kpis.hhi)}`}>
            <div className="insight-icon">📊</div>
            <div className="insight-content">
              <div className="insight-title">Concentración de Mercado</div>
              <div className="insight-text">
                {kpis.hhi < 1500 ?
                  'Mercado desconcentrado - Alta competitividad' :
                  kpis.hhi < 2500 ?
                  'Concentración moderada - Algunos players dominantes' :
                  'Alta concentración - Mercado oligopólico'
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recomendaciones */}
      <div className="report-section recommendations">
        <h3>💡 Recomendaciones de Mejora</h3>
        <ul className="recommendations-list">
          {kpis.tasaAdjudicacion < 50 && (
            <li>Revisar requisitos de licitaciones para mejorar tasa de adjudicación</li>
          )}
          {kpis.tiempoPromedio > 60 && (
            <li>Implementar mejoras en procesos para reducir tiempo de adjudicación</li>
          )}
          {kpis.competenciaPromedio < 3 && (
            <li>Analizar barreras de entrada que limitan la competencia</li>
          )}
          {kpis.hhi > 2500 && (
            <li>Fomentar participación de nuevos proveedores para desconcentrar mercado</li>
          )}
          <li>Establecer benchmarks internos basados en instituciones de mejor desempeño</li>
          <li>Implementar sistema de monitoreo continuo de KPIs críticos</li>
        </ul>
      </div>
    </div>
  );
};

// Extender lodash con función de desviación estándar
declare module 'lodash' {
  interface LoDashStatic {
    std(array: number[]): number;
  }
}

_.mixin({
  std: (arr: number[]) => {
    const mean = _.mean(arr) || 0;
    const variance = _.mean(arr.map(x => Math.pow(x - mean, 2))) || 0;
    return Math.sqrt(variance);
  }
});

export default PerformanceMetricsReport;
