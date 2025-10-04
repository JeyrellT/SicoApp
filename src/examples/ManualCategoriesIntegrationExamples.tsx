/**
 * EJEMPLO DE INTEGRACIÓN DE CATEGORÍAS MANUALES EN DASHBOARDS
 * 
 * Este archivo demuestra cómo usar las categorías manuales en dashboards existentes
 */

import React, { useMemo, useState } from 'react';
import { ManualCategoryIntegrationService } from '../services/ManualCategoryIntegrationService';
import { dataManager } from '../data/DataManager';
import _ from 'lodash';

// ============================================
// EJEMPLO 1: Dashboard con Filtro de Categorías Manuales
// ============================================

export function DashboardWithManualCategories() {
  const [selectedManualCategory, setSelectedManualCategory] = useState<string | null>(null);
  
  // Obtener estadísticas de categorías manuales
  const manualStats = useMemo(() => {
    return ManualCategoryIntegrationService.getManualCategoryStats();
  }, []);

  // Obtener datos filtrados
  const filteredData = useMemo(() => {
    if (!selectedManualCategory) {
      return ManualCategoryIntegrationService.enrichDataForDashboard(
        dataManager.obtenerDatos('DetalleLineaCartel') || []
      );
    }
    
    return ManualCategoryIntegrationService.getLinesByManualCategory(selectedManualCategory);
  }, [selectedManualCategory]);

  return (
    <div>
      <h2>Dashboard con Categorías Manuales</h2>
      
      {/* Selector de categorías */}
      <div style={{ marginBottom: 20 }}>
        <label>Filtrar por categoría manual: </label>
        <select 
          value={selectedManualCategory || ''}
          onChange={(e) => setSelectedManualCategory(e.target.value || null)}
        >
          <option value="">Todas las categorías</option>
          {manualStats.map(stat => (
            <option key={stat.category} value={stat.category}>
              {stat.category} ({stat.count} licitaciones)
            </option>
          ))}
        </select>
      </div>

      {/* Mostrar datos filtrados */}
      <div>
        <h3>Resultados: {filteredData.length} licitaciones</h3>
        {filteredData.slice(0, 10).map((item, i) => (
          <div key={i} style={{ padding: 10, border: '1px solid #ccc', marginBottom: 10 }}>
            <div><strong>{item.numeroCartel}</strong></div>
            <div>{item.descripcionLinea}</div>
            {item.manualCategories && (
              <div>
                <small>Categorías: {item.manualCategories.join(', ')}</small>
                <small> | Confianza: {(item.manualCategoryConfidence * 100).toFixed(0)}%</small>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// EJEMPLO 2: Resumen Combinado (Sistema + Manual)
// ============================================

export function CombinedCategoryOverview() {
  const summary = useMemo(() => {
    return ManualCategoryIntegrationService.getCombinedCategorySummary();
  }, []);

  return (
    <div>
      <h2>Resumen de Categorización</h2>
      
      <div style={{ marginBottom: 20 }}>
        <h3>Estado General</h3>
        <p>Total categorizado: {summary.totalCategorized}</p>
        <p>Sin categorizar: {summary.totalUncategorized}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Categorías del Sistema */}
        <div>
          <h3>Categorías del Sistema</h3>
          {summary.systemCategories.slice(0, 10).map(cat => (
            <div key={cat.category} style={{ padding: 8, borderBottom: '1px solid #eee' }}>
              <strong>{cat.category}</strong>
              <div>
                {cat.count} licitaciones | 
                ₡{cat.totalAmount.toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* Categorías Manuales */}
        <div>
          <h3>Categorías Manuales</h3>
          {summary.manualCategories.slice(0, 10).map(cat => (
            <div key={cat.category} style={{ padding: 8, borderBottom: '1px solid #eee' }}>
              <strong>{cat.category}</strong>
              <div>
                {cat.count} licitaciones | 
                ₡{cat.totalAmount.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// EJEMPLO 3: Gráfico de Categorías con ChartJS
// ============================================

export function ManualCategoriesChart() {
  const stats = useMemo(() => {
    return ManualCategoryIntegrationService.getManualCategoryStats();
  }, []);

  // Preparar datos para gráfico
  const chartData = useMemo(() => {
    return {
      labels: stats.slice(0, 10).map(s => s.category),
      datasets: [{
        label: 'Número de Licitaciones',
        data: stats.slice(0, 10).map(s => s.count),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1
      }]
    };
  }, [stats]);

  return (
    <div>
      <h2>Top 10 Categorías Manuales</h2>
      {/* Aquí integrarías Chart.js o Recharts */}
      <pre>{JSON.stringify(chartData, null, 2)}</pre>
    </div>
  );
}

// ============================================
// EJEMPLO 4: Tabla Enriquecida con Categorías
// ============================================

export function EnrichedDataTable() {
  const [data, setData] = useState<any[]>([]);

  useMemo(() => {
    const lineas = dataManager.obtenerDatos('DetalleLineaCartel') || [];
    const enriched = ManualCategoryIntegrationService.enrichDataForDashboard(
      lineas.slice(0, 100) // Primeras 100 para el ejemplo
    );
    setData(enriched);
  }, []);

  return (
    <div>
      <h2>Tabla con Datos Enriquecidos</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={{ padding: 8, border: '1px solid #e5e7eb' }}>Cartel</th>
            <th style={{ padding: 8, border: '1px solid #e5e7eb' }}>Descripción</th>
            <th style={{ padding: 8, border: '1px solid #e5e7eb' }}>Categorías Manuales</th>
            <th style={{ padding: 8, border: '1px solid #e5e7eb' }}>Confianza</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <tr key={i}>
              <td style={{ padding: 8, border: '1px solid #e5e7eb' }}>
                {item.numeroCartel}
              </td>
              <td style={{ padding: 8, border: '1px solid #e5e7eb' }}>
                {item.descripcionLinea?.slice(0, 100)}...
              </td>
              <td style={{ padding: 8, border: '1px solid #e5e7eb' }}>
                {item.manualCategories?.join(', ') || 'Sin categoría'}
              </td>
              <td style={{ padding: 8, border: '1px solid #e5e7eb' }}>
                {item.manualCategoryConfidence 
                  ? `${(item.manualCategoryConfidence * 100).toFixed(0)}%`
                  : '-'
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// EJEMPLO 5: Widget de Sugerencias
// ============================================

export function CategorySuggestionsWidget() {
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useMemo(() => {
    const newSuggestions = ManualCategoryIntegrationService.suggestNewCategories(5);
    setSuggestions(newSuggestions);
  }, []);

  return (
    <div style={{ 
      background: '#fef3c7', 
      border: '2px solid #fbbf24',
      borderRadius: 8,
      padding: 16,
      margin: 20
    }}>
      <h3 style={{ margin: '0 0 16px 0' }}>💡 Sugerencias de Nuevas Categorías</h3>
      
      {suggestions.map((suggestion, i) => (
        <div key={i} style={{
          background: 'white',
          padding: 12,
          borderRadius: 6,
          marginBottom: 12,
          border: '1px solid #fbbf24'
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>
            {suggestion.suggestedName}
          </div>
          <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
            Aproximadamente {suggestion.estimatedCount} licitaciones encontradas
          </div>
          <div style={{ fontSize: 13, color: '#374151' }}>
            <strong>Ejemplos:</strong>
            <ul style={{ marginTop: 4 }}>
              {suggestion.sampleDescriptions.slice(0, 2).map((desc: string, j: number) => (
                <li key={j}>{desc.slice(0, 80)}...</li>
              ))}
            </ul>
          </div>
          <button style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: 13
          }}>
            Crear Categoría
          </button>
        </div>
      ))}

      {suggestions.length === 0 && (
        <div style={{ color: '#6b7280', fontStyle: 'italic' }}>
          No hay sugerencias disponibles. Todas las licitaciones están categorizadas.
        </div>
      )}
    </div>
  );
}

// ============================================
// EJEMPLO 6: Hook Personalizado para Categorías
// ============================================

export function useManualCategories(filterOptions?: {
  minConfidence?: number;
  institutions?: string[];
}) {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useMemo(() => {
    setLoading(true);
    try {
      const allStats = ManualCategoryIntegrationService.getManualCategoryStats();
      
      let filtered = allStats;
      
      // Aplicar filtros si existen
      if (filterOptions?.minConfidence) {
        // Este ejemplo asume que agregaríamos confianza a las stats
        // En implementación real, necesitarías extender el servicio
      }
      
      setStats(filtered);
    } finally {
      setLoading(false);
    }
  }, [filterOptions]);

  return { stats, loading };
}

// Ejemplo de uso del hook:
export function DashboardWithHook() {
  const { stats, loading } = useManualCategories({
    minConfidence: 0.7
  });

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      <h2>Categorías Manuales (Hook)</h2>
      {stats.map(stat => (
        <div key={stat.category}>
          {stat.category}: {stat.count}
        </div>
      ))}
    </div>
  );
}

// ============================================
// EJEMPLO 7: Integración en Dashboard Existente
// ============================================

/**
 * Cómo integrar en un dashboard existente:
 * 
 * 1. Importar el servicio:
 *    import { ManualCategoryIntegrationService } from '../services/ManualCategoryIntegrationService';
 * 
 * 2. Enriquecer los datos:
 *    const enrichedData = ManualCategoryIntegrationService.enrichDataForDashboard(
 *      yourData,
 *      'descripcionLinea' // campo que contiene el texto a analizar
 *    );
 * 
 * 3. Usar los nuevos campos:
 *    - item.manualCategories: Array de categorías
 *    - item.manualCategoryConfidence: Score 0-1
 *    - item.manualCategoryKeywords: Palabras que matchearon
 * 
 * 4. Agregar filtros:
 *    const filtered = enrichedData.filter(item => 
 *      item.manualCategories.includes('Equipo de Cómputo')
 *    );
 * 
 * 5. Crear visualizaciones:
 *    const byCategory = _.groupBy(enrichedData, item => 
 *      item.manualCategories[0] || 'Sin categoría'
 *    );
 */

export default {
  DashboardWithManualCategories,
  CombinedCategoryOverview,
  ManualCategoriesChart,
  EnrichedDataTable,
  CategorySuggestionsWidget,
  DashboardWithHook,
  useManualCategories
};
