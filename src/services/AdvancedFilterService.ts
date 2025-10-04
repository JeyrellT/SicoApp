/**
 * AdvancedFilterService - Servicio de filtrado avanzado para datos consolidados
 * Permite filtrar datos por año, mes, rangos de fechas y múltiples criterios
 */

import { cacheService } from './CacheService';
import { consolidationService } from './DataConsolidationService';
import _ from 'lodash';

interface FilterCriteria {
  years?: number[];
  months?: number[];
  types?: string[];
  yearRange?: { start: number; end: number };
  monthRange?: { start: number; end: number }; // 1-12
  dateRange?: { start: Date; end: Date };
  customFilters?: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'between' | 'in';
    value: any;
  }>;
}

interface FilteredDataResult {
  data: any[];
  metadata: {
    totalRecords: number;
    filteredRecords: number;
    reductionPercentage: number;
    filtersSummary: string[];
    yearsIncluded: number[];
    monthsIncluded: number[];
    typesIncluded: string[];
  };
}

class AdvancedFilterService {
  /**
   * Filtra datos consolidados con criterios avanzados
   */
  async filterConsolidatedData(criteria: FilterCriteria): Promise<FilteredDataResult> {
    const filtersSummary: string[] = [];

    // Paso 1: Obtener datos consolidados con filtros básicos
    const years = this.expandYearRange(criteria);
    const months = this.expandMonthRange(criteria);
    const types = criteria.types;

    const consolidatedResult = await consolidationService.consolidateData({
      years,
      months,
      types,
    });

    let filteredData = consolidatedResult.data;
    const originalCount = filteredData.length;

    // Agregar información de filtros básicos
    if (years && years.length > 0) {
      filtersSummary.push(`Años: ${years.join(', ')}`);
    }
    if (months && months.length > 0) {
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      filtersSummary.push(`Meses: ${months.map(m => monthNames[m - 1]).join(', ')}`);
    }
    if (types && types.length > 0) {
      filtersSummary.push(`Tipos: ${types.join(', ')}`);
    }

    // Paso 2: Aplicar rango de fechas si existe
    if (criteria.dateRange) {
      const { start, end } = criteria.dateRange;
      filteredData = filteredData.filter(record => {
        const uploadDate = new Date(record._UPLOAD_DATE);
        return uploadDate >= start && uploadDate <= end;
      });
      filtersSummary.push(`Rango de fechas: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`);
    }

    // Paso 3: Aplicar filtros personalizados
    if (criteria.customFilters && criteria.customFilters.length > 0) {
      for (const filter of criteria.customFilters) {
        filteredData = this.applyCustomFilter(filteredData, filter);
        filtersSummary.push(`${filter.field} ${filter.operator} ${filter.value}`);
      }
    }

    // Calcular metadatos del resultado
    const yearsIncluded = [...new Set(filteredData.map(r => r._YEAR))].sort();
    const monthsIncluded = [...new Set(filteredData.map(r => r._MONTH))].sort();
    const typesIncluded = [...new Set(filteredData.map(r => {
      // Extraer el tipo del nombre del archivo
      return r._FILE_SOURCE?.replace(/\.[^/.]+$/, '').replace(/[0-9_-]/g, '').trim() || 'Desconocido';
    }))].sort();

    const reductionPercentage = originalCount > 0
      ? Math.round(((originalCount - filteredData.length) / originalCount) * 100)
      : 0;

    return {
      data: filteredData,
      metadata: {
        totalRecords: originalCount,
        filteredRecords: filteredData.length,
        reductionPercentage,
        filtersSummary,
        yearsIncluded,
        monthsIncluded,
        typesIncluded,
      },
    };
  }

  /**
   * Expande un rango de años en una lista
   */
  private expandYearRange(criteria: FilterCriteria): number[] | undefined {
    if (criteria.years && criteria.years.length > 0) {
      return criteria.years;
    }

    if (criteria.yearRange) {
      const { start, end } = criteria.yearRange;
      const years: number[] = [];
      for (let year = start; year <= end; year++) {
        years.push(year);
      }
      return years;
    }

    return undefined;
  }

  /**
   * Expande un rango de meses en una lista
   */
  private expandMonthRange(criteria: FilterCriteria): number[] | undefined {
    if (criteria.months && criteria.months.length > 0) {
      return criteria.months;
    }

    if (criteria.monthRange) {
      const { start, end } = criteria.monthRange;
      const months: number[] = [];
      for (let month = start; month <= end; month++) {
        months.push(month);
      }
      return months;
    }

    return undefined;
  }

  /**
   * Aplica un filtro personalizado a los datos
   */
  private applyCustomFilter(
    data: any[],
    filter: { field: string; operator: string; value: any }
  ): any[] {
    const { field, operator, value } = filter;

    switch (operator) {
      case 'equals':
        return data.filter(record => record[field] === value);

      case 'contains':
        return data.filter(record => {
          const fieldValue = String(record[field] || '').toLowerCase();
          const searchValue = String(value).toLowerCase();
          return fieldValue.includes(searchValue);
        });

      case 'greaterThan':
        return data.filter(record => {
          const fieldValue = parseFloat(record[field]);
          return !isNaN(fieldValue) && fieldValue > parseFloat(value);
        });

      case 'lessThan':
        return data.filter(record => {
          const fieldValue = parseFloat(record[field]);
          return !isNaN(fieldValue) && fieldValue < parseFloat(value);
        });

      case 'between':
        if (Array.isArray(value) && value.length === 2) {
          return data.filter(record => {
            const fieldValue = parseFloat(record[field]);
            return !isNaN(fieldValue) && fieldValue >= parseFloat(value[0]) && fieldValue <= parseFloat(value[1]);
          });
        }
        return data;

      case 'in':
        if (Array.isArray(value)) {
          return data.filter(record => value.includes(record[field]));
        }
        return data;

      default:
        console.warn(`Operador de filtro desconocido: ${operator}`);
        return data;
    }
  }

  /**
   * Filtra datos por un rango de años específico
   */
  async filterByYearRange(startYear: number, endYear: number, types?: string[]): Promise<FilteredDataResult> {
    return this.filterConsolidatedData({
      yearRange: { start: startYear, end: endYear },
      types,
    });
  }

  /**
   * Filtra datos por trimestre (Q1, Q2, Q3, Q4)
   */
  async filterByQuarter(year: number, quarter: 1 | 2 | 3 | 4, types?: string[]): Promise<FilteredDataResult> {
    const quarterMonths = {
      1: [1, 2, 3],
      2: [4, 5, 6],
      3: [7, 8, 9],
      4: [10, 11, 12],
    };

    return this.filterConsolidatedData({
      years: [year],
      months: quarterMonths[quarter],
      types,
    });
  }

  /**
   * Filtra datos por semestre (H1, H2)
   */
  async filterBySemester(year: number, semester: 1 | 2, types?: string[]): Promise<FilteredDataResult> {
    const semesterMonths = {
      1: [1, 2, 3, 4, 5, 6],
      2: [7, 8, 9, 10, 11, 12],
    };

    return this.filterConsolidatedData({
      years: [year],
      months: semesterMonths[semester],
      types,
    });
  }

  /**
   * Compara datos entre dos periodos
   */
  async comparePeriods(
    period1: { year: number; month?: number },
    period2: { year: number; month?: number },
    type: string,
    compareField: string
  ): Promise<{
    period1Data: any[];
    period2Data: any[];
    comparison: {
      period1Value: number;
      period2Value: number;
      difference: number;
      percentageChange: number;
      trend: 'up' | 'down' | 'stable';
    };
  }> {
    const result1 = await this.filterConsolidatedData({
      years: [period1.year],
      months: period1.month ? [period1.month] : undefined,
      types: [type],
    });

    const result2 = await this.filterConsolidatedData({
      years: [period2.year],
      months: period2.month ? [period2.month] : undefined,
      types: [type],
    });

    // Calcular valores agregados
    const values1 = result1.data
      .map(r => parseFloat(r[compareField]))
      .filter(v => !isNaN(v));
    const values2 = result2.data
      .map(r => parseFloat(r[compareField]))
      .filter(v => !isNaN(v));

    const period1Value = _.sum(values1);
    const period2Value = _.sum(values2);
    const difference = period2Value - period1Value;
    const percentageChange = period1Value !== 0 ? (difference / period1Value) * 100 : 0;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (percentageChange > 1) trend = 'up';
    else if (percentageChange < -1) trend = 'down';

    return {
      period1Data: result1.data,
      period2Data: result2.data,
      comparison: {
        period1Value,
        period2Value,
        difference,
        percentageChange,
        trend,
      },
    };
  }

  /**
   * Obtiene un resumen de datos agrupados por año y mes
   */
  async getSummaryByPeriod(
    criteria: FilterCriteria,
    groupBy: 'year' | 'month' | 'yearMonth',
    aggregateField: string,
    aggregateFunction: 'sum' | 'avg' | 'count' | 'min' | 'max'
  ): Promise<Array<{
    year?: number;
    month?: number;
    value: number;
    recordCount: number;
  }>> {
    const result = await this.filterConsolidatedData(criteria);

    let grouped: { [key: string]: any[] };

    switch (groupBy) {
      case 'year':
        grouped = _.groupBy(result.data, '_YEAR');
        break;
      case 'month':
        grouped = _.groupBy(result.data, '_MONTH');
        break;
      case 'yearMonth':
        grouped = _.groupBy(result.data, r => `${r._YEAR}-${r._MONTH}`);
        break;
      default:
        throw new Error(`Tipo de agrupación no soportado: ${groupBy}`);
    }

    const summary = Object.keys(grouped).map(key => {
      const records = grouped[key];
      const values = records
        .map(r => parseFloat(r[aggregateField]))
        .filter(v => !isNaN(v));

      let value = 0;
      switch (aggregateFunction) {
        case 'sum':
          value = _.sum(values);
          break;
        case 'avg':
          value = _.mean(values);
          break;
        case 'count':
          value = values.length;
          break;
        case 'min':
          value = _.min(values) || 0;
          break;
        case 'max':
          value = _.max(values) || 0;
          break;
      }

      // Parsear la clave para extraer año/mes
      const parts = key.split('-');
      const entry: any = {
        value,
        recordCount: records.length,
      };

      if (groupBy === 'year') {
        entry.year = parseInt(key);
      } else if (groupBy === 'month') {
        entry.month = parseInt(key);
      } else if (groupBy === 'yearMonth') {
        entry.year = parseInt(parts[0]);
        entry.month = parseInt(parts[1]);
      }

      return entry;
    });

    return summary;
  }

  /**
   * Exporta datos filtrados a CSV
   */
  async exportFilteredDataToCSV(
    criteria: FilterCriteria,
    fileName: string = 'datos_filtrados.csv'
  ): Promise<void> {
    const result = await this.filterConsolidatedData(criteria);

    if (result.data.length === 0) {
      console.warn('No hay datos para exportar');
      return;
    }

    // Obtener headers
    const headers = Object.keys(result.data[0]);

    // Crear CSV
    const csvRows = [
      headers.join(','),
      ...result.data.map(row =>
        headers.map(header => {
          const value = row[header];
          // Escapar valores que contengan comas o comillas
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        }).join(',')
      ),
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(`✅ Exportados ${result.data.length} registros a ${fileName}`);
  }
}

export const advancedFilterService = new AdvancedFilterService();
export type { FilterCriteria, FilteredDataResult };
