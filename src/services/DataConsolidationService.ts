/**
 * DataConsolidationService - Consolida datos de múltiples archivos CSV
 * organizados por año y mes
 */

import { cacheService } from './CacheService';
import { cacheDataManagerSync } from './CacheDataManagerSync';
import _ from 'lodash';

interface ConsolidationOptions {
  years?: number[];
  months?: number[];
  types?: string[];
  deduplicateBy?: string; // Campo clave para eliminar duplicados
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface ConsolidatedResult {
  data: any[];
  metadata: {
    totalRecords: number;
    filesIncluded: number;
    yearRange: { min: number; max: number };
    monthRange: { min: number; max: number };
    types: string[];
    consolidatedAt: string;
  };
}

class DataConsolidationService {
  /**
   * Consolida datos de múltiples archivos basándose en filtros
   */
  async consolidateData(options: ConsolidationOptions = {}): Promise<ConsolidatedResult> {
    const { years, months, types, deduplicateBy, sortBy, sortOrder = 'asc' } = options;

    // Validar tipos solicitados si se especifican
    if (types && types.length > 0) {
      const unsupportedTypes = types.filter(t => !cacheDataManagerSync.isTypeSupported(t));
      if (unsupportedTypes.length > 0) {
        console.warn(
          `⚠️ Tipos no soportados por DataManager: ${unsupportedTypes.join(', ')}. ` +
          `Estos datos pueden no cargarse correctamente.`
        );
      }
    }

    // Obtener metadatos para filtrar archivos
    const metadata = await cacheService.getMetadata();
    
    // Filtrar archivos según criterios
    let filteredFiles = metadata.files;

    if (years && years.length > 0) {
      filteredFiles = filteredFiles.filter(f => years.includes(f.year));
    }

    if (months && months.length > 0) {
      filteredFiles = filteredFiles.filter(f => months.includes(f.month));
    }

    if (types && types.length > 0) {
      filteredFiles = filteredFiles.filter(f => types.includes(f.type));
    }

    // Cargar datos de todos los archivos filtrados
    const filesData = await Promise.all(
      filteredFiles.map(f => cacheService.getFile(f.id))
    );

    // Consolidar todos los datos con columnas de año y mes
    let consolidatedData: any[] = [];
    filesData.forEach(fileData => {
      if (fileData && fileData.data) {
        // Agregar columnas _YEAR y _MONTH a cada registro
        const dataWithPeriod = fileData.data.map(record => ({
          ...record,
          _YEAR: fileData.fileInfo.year,
          _MONTH: fileData.fileInfo.month,
          _FILE_SOURCE: fileData.fileInfo.fileName,
          _UPLOAD_DATE: fileData.fileInfo.uploadDate
        }));
        consolidatedData = consolidatedData.concat(dataWithPeriod);
      }
    });

    // Calcular metadatos del resultado ANTES de deduplicación
    const yearsList = filteredFiles.map(f => f.year);
    const monthsList = filteredFiles.map(f => f.month);
    const typesList = [...new Set(filteredFiles.map(f => f.type))];

    // IMPORTANTE: Los datos en cache ya están limpios
    // Solo deduplicar si el usuario lo solicita explícitamente
    if (deduplicateBy && consolidatedData.length > 0) {
      const beforeCount = consolidatedData.length;
      consolidatedData = _.uniqBy(consolidatedData, deduplicateBy);
      const afterCount = consolidatedData.length;
      
      if (beforeCount > afterCount) {
        console.log(
          `🔧 Deduplicación manual por "${deduplicateBy}": ` +
          `${beforeCount} → ${afterCount} registros ` +
          `(removidos ${beforeCount - afterCount} duplicados)`
        );
      }
    }

    // Ordenar si se especifica
    if (sortBy && consolidatedData.length > 0) {
      consolidatedData = _.orderBy(consolidatedData, [sortBy], [sortOrder]);
    }

    return {
      data: consolidatedData,
      metadata: {
        totalRecords: consolidatedData.length,
        filesIncluded: filteredFiles.length,
        yearRange: {
          min: Math.min(...yearsList),
          max: Math.max(...yearsList),
        },
        monthRange: {
          min: Math.min(...monthsList),
          max: Math.max(...monthsList),
        },
        types: typesList,
        consolidatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Consolida datos de un tipo específico de archivo
   */
  async consolidateByType(
    type: string,
    options: Omit<ConsolidationOptions, 'types'> = {}
  ): Promise<ConsolidatedResult> {
    return this.consolidateData({
      ...options,
      types: [type],
    });
  }

  /**
   * Consolida datos de un año específico
   */
  async consolidateByYear(
    year: number,
    options: Omit<ConsolidationOptions, 'years'> = {}
  ): Promise<ConsolidatedResult> {
    return this.consolidateData({
      ...options,
      years: [year],
    });
  }

  /**
   * Consolida datos de un mes específico
   */
  async consolidateByMonth(
    year: number,
    month: number,
    options: Omit<ConsolidationOptions, 'years' | 'months'> = {}
  ): Promise<ConsolidatedResult> {
    return this.consolidateData({
      ...options,
      years: [year],
      months: [month],
    });
  }

  /**
   * Consolida datos de un rango de años
   */
  async consolidateByYearRange(
    startYear: number,
    endYear: number,
    options: Omit<ConsolidationOptions, 'years'> = {}
  ): Promise<ConsolidatedResult> {
    const years = [];
    for (let year = startYear; year <= endYear; year++) {
      years.push(year);
    }
    return this.consolidateData({
      ...options,
      years,
    });
  }

  /**
   * Consolida todos los datos disponibles
   */
  async consolidateAll(
    options: Omit<ConsolidationOptions, 'years' | 'months' | 'types'> = {}
  ): Promise<ConsolidatedResult> {
    return this.consolidateData(options);
  }

  /**
   * Agrupa datos consolidados por un campo específico
   */
  async consolidateAndGroupBy(
    groupByField: string,
    options: ConsolidationOptions = {}
  ): Promise<{ [key: string]: any[] }> {
    const result = await this.consolidateData(options);
    return _.groupBy(result.data, groupByField);
  }

  /**
   * Consolida y aplica una función de agregación
   */
  async consolidateAndAggregate(
    aggregateField: string,
    aggregateFunction: 'sum' | 'avg' | 'min' | 'max' | 'count',
    groupByField?: string,
    options: ConsolidationOptions = {}
  ): Promise<any> {
    const result = await this.consolidateData(options);
    
    if (!groupByField) {
      // Agregación global
      const values = result.data
        .map(item => parseFloat(item[aggregateField]))
        .filter(v => !isNaN(v));

      switch (aggregateFunction) {
        case 'sum':
          return _.sum(values);
        case 'avg':
          return _.mean(values);
        case 'min':
          return _.min(values);
        case 'max':
          return _.max(values);
        case 'count':
          return values.length;
        default:
          return null;
      }
    } else {
      // Agregación por grupo
      const grouped = _.groupBy(result.data, groupByField);
      const aggregated: any = {};

      Object.keys(grouped).forEach(key => {
        const values = grouped[key]
          .map(item => parseFloat(item[aggregateField]))
          .filter(v => !isNaN(v));

        switch (aggregateFunction) {
          case 'sum':
            aggregated[key] = _.sum(values);
            break;
          case 'avg':
            aggregated[key] = _.mean(values);
            break;
          case 'min':
            aggregated[key] = _.min(values);
            break;
          case 'max':
            aggregated[key] = _.max(values);
            break;
          case 'count':
            aggregated[key] = values.length;
            break;
        }
      });

      return aggregated;
    }
  }

  /**
   * Obtiene estadísticas de datos consolidados
   */
  async getConsolidatedStats(
    options: ConsolidationOptions = {}
  ): Promise<{
    totalRecords: number;
    filesIncluded: number;
    yearRange: string;
    monthRange: string;
    types: string[];
    sizeInMB: number;
  }> {
    const result = await this.consolidateData(options);
    const sizeInBytes = new Blob([JSON.stringify(result.data)]).size;
    const sizeInMB = sizeInBytes / (1024 * 1024);

    return {
      totalRecords: result.metadata.totalRecords,
      filesIncluded: result.metadata.filesIncluded,
      yearRange: `${result.metadata.yearRange.min} - ${result.metadata.yearRange.max}`,
      monthRange: `${result.metadata.monthRange.min} - ${result.metadata.monthRange.max}`,
      types: result.metadata.types,
      sizeInMB: Math.round(sizeInMB * 100) / 100,
    };
  }

  /**
   * Exporta datos consolidados como CSV
   */
  async exportConsolidatedCSV(
    options: ConsolidationOptions = {}
  ): Promise<string> {
    const result = await this.consolidateData(options);
    
    if (result.data.length === 0) {
      return '';
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

    return csvRows.join('\n');
  }

  /**
   * Descarga datos consolidados como archivo CSV
   */
  async downloadConsolidatedCSV(
    fileName: string = 'datos_consolidados.csv',
    options: ConsolidationOptions = {}
  ): Promise<void> {
    const csvContent = await this.exportConsolidatedCSV(options);
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Consolida datos y los guarda como un nuevo archivo en caché
   */
  async saveConsolidatedAsCache(
    fileName: string,
    year: number,
    month: number,
    type: string,
    options: ConsolidationOptions = {}
  ): Promise<string> {
    const result = await this.consolidateData(options);
    
    const fileId = await cacheService.saveFile(
      fileName,
      result.data,
      year,
      month,
      type
    );

    return fileId;
  }

  /**
   * Compara datos entre diferentes periodos
   */
  async comparePerio(
    year1: number,
    month1: number,
    year2: number,
    month2: number,
    type: string,
    compareField: string
  ): Promise<{
    period1: { year: number; month: number; value: number; count: number };
    period2: { year: number; month: number; value: number; count: number };
    difference: number;
    percentageChange: number;
  }> {
    const period1Data = await this.consolidateByMonth(year1, month1, { types: [type] });
    const period2Data = await this.consolidateByMonth(year2, month2, { types: [type] });

    const value1 = await this.consolidateAndAggregate(
      compareField,
      'sum',
      undefined,
      { years: [year1], months: [month1], types: [type] }
    );

    const value2 = await this.consolidateAndAggregate(
      compareField,
      'sum',
      undefined,
      { years: [year2], months: [month2], types: [type] }
    );

    const difference = value2 - value1;
    const percentageChange = value1 !== 0 ? (difference / value1) * 100 : 0;

    return {
      period1: {
        year: year1,
        month: month1,
        value: value1,
        count: period1Data.metadata.totalRecords,
      },
      period2: {
        year: year2,
        month: month2,
        value: value2,
        count: period2Data.metadata.totalRecords,
      },
      difference,
      percentageChange,
    };
  }
}

export const consolidationService = new DataConsolidationService();
export type { ConsolidationOptions, ConsolidatedResult };
