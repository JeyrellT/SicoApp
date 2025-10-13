// ================================
// REPORTE DE TENDENCIAS DE PRECIOS
// ================================
// Análisis histórico de precios y proyecciones

import React, { useMemo } from 'react';
import { dataManager } from '../../data/DataManager';
import _ from 'lodash';

interface PriceTrendsReportProps {
  filters: {
    periodo: { inicio: Date; fin: Date };
    sectores: string[];
    incluirOportunidades: boolean;
  };
}

const PriceTrendsReport: React.FC<PriceTrendsReportProps> = ({ filters }) => {
  
  // Análisis de precios históricos
  const analisisPrecios = useMemo(() => {
    const lineasAdjudicadas = dataManager.obtenerDatos('LineasAdjudicadas');
    const lineasCartel = dataManager.obtenerDatos('DetalleLineaCartel');
    const carteles = dataManager.obtenerDatos('DetalleCarteles')
      .filter(c => c.fechaPublicacion && c.fechaPublicacion >= filters.periodo.inicio && c.fechaPublicacion <= filters.periodo.fin);

    const preciosHistoricos: any[] = [];

    lineasAdjudicadas.forEach(linea => {
      const cartel = carteles.find(c => c.numeroCartel === linea.numeroCartel);
      if (!cartel) return;

      const lineaDetalle = lineasCartel.find(lc => 
        lc.numeroCartel === linea.numeroCartel && lc.numeroLinea === linea.numeroLinea
      );

      if (lineaDetalle && linea.precioAdjudicado && linea.cantidadAdjudicada) {
        // Filtrar por sectores si está activo
        if (filters.sectores.length > 0) {
          const texto = `${cartel.nombreCartel || ''} ${lineaDetalle.descripcionLinea || ''}`.toLowerCase();
          const tieneSector = filters.sectores.some(s => texto.includes(s.toLowerCase()));
          if (!tieneSector) return;
        }

        preciosHistoricos.push({
          fecha: cartel.fechaPublicacion,
          producto: lineaDetalle.descripcionLinea,
          precio: linea.precioAdjudicado,
          cantidad: linea.cantidadAdjudicada,
          precioUnitario: linea.precioAdjudicado / linea.cantidadAdjudicada,
          proveedor: linea.idProveedorAdjudicado,
          cartel: linea.numeroCartel,
          unidadMedida: lineaDetalle.unidadMedida
        });
      }
    });

    // Agrupar por categorías de productos similares
    const productosPorCategoria = _.groupBy(preciosHistoricos, item => {
      const descripcion = item.producto.toLowerCase();
      
      // Categorización simple basada en palabras clave
      if (descripcion.includes('medicamento') || descripcion.includes('medicina')) return 'Medicamentos';
      if (descripcion.includes('computadora') || descripcion.includes('laptop') || descripcion.includes('equipo')) return 'Equipos';
      if (descripcion.includes('servicio') || descripcion.includes('consultoría')) return 'Servicios';
      if (descripcion.includes('alimento') || descripcion.includes('comida')) return 'Alimentos';
      if (descripcion.includes('construcción') || descripcion.includes('obra')) return 'Construcción';
      if (descripcion.includes('transporte') || descripcion.includes('vehículo')) return 'Transporte';
      if (descripcion.includes('papel') || descripcion.includes('útil')) return 'Suministros';
      
      return 'Otros';
    });

    // Calcular estadísticas por categoría
    const estadisticasPorCategoria = _.map(productosPorCategoria, (items, categoria) => {
      const precios = items.map(i => i.precioUnitario).filter(p => p > 0 && p < 1000000000);
      const preciosOrdenados = _.sortBy(precios);
      
      return {
        categoria,
        cantidad: items.length,
        precioPromedio: _.mean(precios) || 0,
        precioMinimo: _.min(precios) || 0,
        precioMaximo: _.max(precios) || 0,
        precioMediana: preciosOrdenados[Math.floor(preciosOrdenados.length / 2)] || 0,
        variabilidad: _.mean(precios) > 0 ? (_.std(precios) / _.mean(precios)) * 100 : 0,
        tendencia: calcularTendencia(items)
      };
    }).sort((a, b) => b.cantidad - a.cantidad);

    return {
      preciosHistoricos,
      estadisticasPorCategoria,
      totalRegistros: preciosHistoricos.length
    };
  }, [filters]);

  // Calcular tendencia simple
  const calcularTendencia = (items: any[]): number => {
    if (items.length < 2) return 0;
    
    const ordenados = _.sortBy(items, 'fecha');
    const primerCuartil = ordenados.slice(0, Math.floor(ordenados.length / 4));
    const ultimoCuartil = ordenados.slice(-Math.floor(ordenados.length / 4));
    
    const promedioPrimero = _.meanBy(primerCuartil, 'precioUnitario') || 1;
    const promedioUltimo = _.meanBy(ultimoCuartil, 'precioUnitario') || 0;
    
    return ((promedioUltimo - promedioPrimero) / promedioPrimero) * 100;
  };

  // Evolución temporal de precios
  const evolucionTemporal = useMemo(() => {
    const porMes = _.groupBy(analisisPrecios.preciosHistoricos, item => {
      const fecha = item.fecha;
      return fecha ? `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}` : 'Sin fecha';
    });

    return _.map(porMes, (items, periodo) => ({
      periodo,
      precioPromedio: _.meanBy(items, 'precioUnitario') || 0,
      cantidad: items.length,
      montoTotal: _.sumBy(items, 'precio') || 0
    }))
    .filter(item => item.periodo !== 'Sin fecha')
    .sort((a, b) => a.periodo.localeCompare(b.periodo));
  }, [analisisPrecios]);

  return (
    <div className="price-trends-report">
      <h2 className="report-title">💰 Tendencias de Precios Históricos</h2>
      
      <div className="report-intro">
        <p>
          Análisis de {analisisPrecios.totalRegistros.toLocaleString()} registros de precios 
          en {analisisPrecios.estadisticasPorCategoria.length} categorías
        </p>
      </div>

      {analisisPrecios.estadisticasPorCategoria.length === 0 && (
        <div className="no-data-message">
          <div className="alert info">
            ℹ️ No hay suficientes datos de precios en el período seleccionado. 
            Prueba ajustando los filtros de período o sectores.
          </div>
        </div>
      )}

      {/* Resumen por categoría */}
      <div className="report-section">
        <h3>📊 Análisis por Categoría de Producto</h3>
        <div className="categories-grid">
          {analisisPrecios.estadisticasPorCategoria.map(cat => (
            <div key={cat.categoria} className="category-price-card">
              <div className="category-header">
                <div className="category-name">{cat.categoria}</div>
                <div className={`category-trend ${cat.tendencia >= 0 ? 'up' : 'down'}`}>
                  {cat.tendencia >= 0 ? '📈' : '📉'} {Math.abs(cat.tendencia).toFixed(1)}%
                </div>
              </div>

              <div className="category-stats">
                <div className="stat-row">
                  <span className="stat-label">Registros:</span>
                  <span className="stat-value">{cat.cantidad}</span>
                </div>
                <div className="stat-row highlight">
                  <span className="stat-label">Precio Promedio:</span>
                  <span className="stat-value">₡{cat.precioPromedio.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Mínimo:</span>
                  <span className="stat-value">₡{cat.precioMinimo.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Máximo:</span>
                  <span className="stat-value">₡{cat.precioMaximo.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Mediana:</span>
                  <span className="stat-value">₡{cat.precioMediana.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                </div>
              </div>

              <div className="category-variability">
                <div className="variability-label">Variabilidad</div>
                <div className="variability-bar">
                  <div 
                    className={`variability-fill ${cat.variabilidad > 50 ? 'high' : cat.variabilidad > 25 ? 'medium' : 'low'}`}
                    style={{ width: `${Math.min(cat.variabilidad, 100)}%` }}
                  />
                  <span className="variability-text">{cat.variabilidad.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Evolución temporal */}
      <div className="report-section">
        <h3>📈 Evolución Temporal de Precios</h3>
        <div className="temporal-chart">
          <div className="chart-container">
            {evolucionTemporal.length > 0 ? (
              <div className="line-chart">
                {evolucionTemporal.map((punto, index) => {
                  const maxPrecio = Math.max(...evolucionTemporal.map(p => p.precioPromedio));
                  const altura = (punto.precioPromedio / maxPrecio) * 100;
                  
                  return (
                    <div key={punto.periodo} className="chart-bar">
                      <div className="bar-container">
                        <div 
                          className="bar-fill" 
                          style={{ height: `${altura}%` }}
                          title={`₡${punto.precioPromedio.toLocaleString(undefined, {maximumFractionDigits: 0})}`}
                        />
                      </div>
                      <div className="bar-label">{punto.periodo}</div>
                      <div className="bar-value">
                        ₡{(punto.precioPromedio / 1000).toFixed(0)}K
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="no-data">No hay datos suficientes para mostrar la evolución temporal</div>
            )}
          </div>
        </div>
      </div>

      {/* Comparativa de variabilidad */}
      <div className="report-section">
        <h3>📊 Variabilidad de Precios por Categoría</h3>
        <div className="variability-comparison">
          {analisisPrecios.estadisticasPorCategoria.map(cat => (
            <div key={cat.categoria} className="variability-row">
              <div className="variability-category">{cat.categoria}</div>
              <div className="variability-visual">
                <div className="variability-range">
                  <span className="range-min">₡{(cat.precioMinimo / 1000).toFixed(0)}K</span>
                  <div className="range-bar">
                    <div className="range-median" style={{ left: `${((cat.precioMediana - cat.precioMinimo) / (cat.precioMaximo - cat.precioMinimo)) * 100}%` }}>
                      <span className="median-label">Mediana</span>
                    </div>
                  </div>
                  <span className="range-max">₡{(cat.precioMaximo / 1000).toFixed(0)}K</span>
                </div>
                <div className="variability-coefficient">
                  CV: {cat.variabilidad.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="report-section insights">
        <h3>💡 Insights de Precios</h3>
        {analisisPrecios.estadisticasPorCategoria.length > 0 ? (
        <div className="insights-grid">
          <div className="insight-card">
            <div className="insight-icon">📈</div>
            <div className="insight-content">
              <div className="insight-title">Mayor Crecimiento</div>
              <div className="insight-text">
                {analisisPrecios.estadisticasPorCategoria.reduce((max, c) => c.tendencia > max.tendencia ? c : max, analisisPrecios.estadisticasPorCategoria[0])?.categoria}
                {' '}ha incrementado {Math.max(...analisisPrecios.estadisticasPorCategoria.map(c => c.tendencia || 0)).toFixed(1)}% 
                en el período
              </div>
            </div>
          </div>

          <div className="insight-card">
            <div className="insight-icon">⚖️</div>
            <div className="insight-content">
              <div className="insight-title">Mayor Estabilidad</div>
              <div className="insight-text">
                {analisisPrecios.estadisticasPorCategoria.reduce((min, c) => c.variabilidad < min.variabilidad ? c : min, analisisPrecios.estadisticasPorCategoria[0])?.categoria}
                {' '}presenta la menor variabilidad con {Math.min(...analisisPrecios.estadisticasPorCategoria.map(c => c.variabilidad || 0)).toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="insight-card">
            <div className="insight-icon">🎯</div>
            <div className="insight-content">
              <div className="insight-title">Mayor Actividad</div>
              <div className="insight-text">
                {analisisPrecios.estadisticasPorCategoria[0]?.categoria} lidera con {analisisPrecios.estadisticasPorCategoria[0]?.cantidad} registros
              </div>
            </div>
          </div>

          <div className="insight-card warning">
            <div className="insight-icon">⚠️</div>
            <div className="insight-content">
              <div className="insight-title">Mayor Volatilidad</div>
              <div className="insight-text">
                {analisisPrecios.estadisticasPorCategoria.reduce((max, c) => c.variabilidad > max.variabilidad ? c : max, analisisPrecios.estadisticasPorCategoria[0])?.categoria}
                {' '}muestra alta variabilidad ({Math.max(...analisisPrecios.estadisticasPorCategoria.map(c => c.variabilidad || 0)).toFixed(1)}%) - 
                Requiere análisis detallado
              </div>
            </div>
          </div>
        </div>
        ) : (
          <div className="alert info">
            ℹ️ No hay suficientes datos para generar insights de precios
          </div>
        )}
      </div>

      {/* Recomendaciones */}
      <div className="report-section recommendations">
        <h3>💡 Recomendaciones de Precio</h3>
        <ul className="recommendations-list">
          <li>
            Para categorías con alta variabilidad (&gt;50%), realice análisis detallado de especificaciones 
            técnicas que puedan justificar las diferencias de precio
          </li>
          <li>
            Considere los precios medianos en lugar de promedios para categorías con alta dispersión
          </li>
          <li>
            Categorías con tendencia positiva sostenida pueden requerir ajuste de presupuestos futuros
          </li>
          <li>
            Monitoree de cerca las categorías con volatilidad creciente para identificar oportunidades de ahorro
          </li>
        </ul>
      </div>
    </div>
  );
};

// Función auxiliar para calcular desviación estándar
declare module 'lodash' {
  interface LoDashStatic {
    std(array: number[]): number;
  }
}

// Implementación simple de desviación estándar
_.mixin({
  std: (arr: number[]) => {
    const mean = _.mean(arr) || 0;
    const variance = _.mean(arr.map(x => Math.pow(x - mean, 2))) || 0;
    return Math.sqrt(variance);
  }
});

export default PriceTrendsReport;
