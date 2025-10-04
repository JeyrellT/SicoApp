/**
 * SchemaAnalysisService - Análisis profundo de schemas y datos
 * Similar a Tableau Prep: muestra tipos, estadísticas descriptivas y calidad de datos
 */

import { cacheService } from './CacheService';
import { MAPEO_HEADERS_POR_TABLA } from '../data/relations';
import { FILE_SCHEMAS } from './FileValidationService';
import type { FileSchema } from './FileValidationService';
import _ from 'lodash';

// Tipos de datos detectables
export type DataType = 
  | 'string' 
  | 'number' 
  | 'date' 
  | 'boolean' 
  | 'currency' 
  | 'percentage'
  | 'id' 
  | 'code'
  | 'email'
  | 'phone'
  | 'mixed'
  | 'null';

// Información de una columna
export interface ColumnInfo {
  columnName: string;
  originalName?: string;
  mappedName?: string;
  dataType: DataType;
  confidence: number; // 0-1, qué tan seguro estamos del tipo
  totalValues: number;
  nullCount: number;
  uniqueCount: number;
  completeness: number; // % de valores no nulos
  distinctness: number; // % de valores únicos
  
  // Estadísticas numéricas
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  
  // Estadísticas de texto
  minLength?: number;
  maxLength?: number;
  avgLength?: number;
  
  // Valores de muestra
  sampleValues: any[];
  topValues?: Array<{ value: any; count: number; percentage: number }>;
  
  // Patrones detectados
  patterns?: string[];
  issues?: string[]; // problemas de calidad
}

// Análisis completo de un archivo
export interface FileSchemaAnalysis {
  tableName: string;
  originalFileName: string;
  totalRows: number;
  totalColumns: number;
  columns: ColumnInfo[];
  
  // Mapeo aplicado
  headerMapping: Record<string, string>;
  unmappedColumns: string[];
  
  // Schema esperado vs real
  expectedSchema?: {
    type: string;
    requiredFields: string[];
    optionalFields: string[];
  };
  missingRequiredFields: string[];
  extraFields: string[];
  
  // Métricas de calidad
  qualityScore: number; // 0-100
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    column?: string;
    message: string;
  }>;
  
  // Metadatos temporales
  temporalCoverage?: {
    years: string[];
    months: string[];
    files: string[];
  };
}

class SchemaAnalysisService {
  
  /**
   * Analiza todos los archivos en el caché
   * @param year - Filtrar por año (opcional)
   * @param month - Filtrar por mes (opcional)
   */
  async analyzeAllFiles(year?: number, month?: number): Promise<FileSchemaAnalysis[]> {
    const consolidatedData = await cacheService.getConsolidatedData();
    const analyses: FileSchemaAnalysis[] = [];
    
    for (const [tableName, records] of Object.entries(consolidatedData)) {
      if (!Array.isArray(records) || records.length === 0) continue;
      
      // Aplicar filtros temporales si se proporcionan
      let filteredRecords = records;
      if (year !== undefined) {
        filteredRecords = filteredRecords.filter((r: any) => r._YEAR === year);
      }
      if (month !== undefined) {
        filteredRecords = filteredRecords.filter((r: any) => r._MONTH === month);
      }
      
      // Si después del filtrado no hay registros, omitir esta tabla
      if (filteredRecords.length === 0) continue;
      
      const analysis = this.analyzeTable(tableName, filteredRecords);
      analyses.push(analysis);
    }
    
    return _.sortBy(analyses, a => -a.totalRows);
  }
  
  /**
   * Analiza una tabla específica
   */
  analyzeTable(tableName: string, records: any[]): FileSchemaAnalysis {
    console.log(`📊 Analizando schema de ${tableName}...`);
    
    // Obtener schema esperado
    const expectedSchema = FILE_SCHEMAS.find((s: FileSchema) => s.type === tableName);
    const headerMapping = MAPEO_HEADERS_POR_TABLA[tableName] || {};
    
    // Analizar columnas
    const allColumns = this.extractAllColumnNames(records);
    const columns: ColumnInfo[] = [];
    
    for (const columnName of allColumns) {
      const columnInfo = this.analyzeColumn(columnName, records, headerMapping);
      columns.push(columnInfo);
    }
    
    // Separar columnas de metadatos
    const metadataFields = ['_YEAR', '_MONTH', '_FILE_SOURCE', '_UPLOAD_DATE'];
    const dataColumns = columns.filter(c => !metadataFields.includes(c.columnName));
    const metaColumns = columns.filter(c => metadataFields.includes(c.columnName));
    
    // Nombres de columnas disponibles después del mapeo
    const mappedColumnNames = new Set(
      columns.map(c => c.columnName) // Usamos columnName porque ya está mapeado
    );
    
    // Detectar campos requeridos: mapear nombres esperados usando headerMapping
    const requiredFieldsStatus = (expectedSchema?.requiredFields || []).map((field: string) => {
      // Intentar mapear el campo requerido usando el mismo headerMapping
      const fieldLower = field.trim().toLowerCase();
      const mappedFieldName = headerMapping[fieldLower] || field;
      
      // Verificar si existe la columna mapeada
      const isMapped = mappedColumnNames.has(mappedFieldName);
      
      // Determinar si fue mapeado (nombre original diferente al esperado)
      const wasMapped = headerMapping[fieldLower] !== undefined && headerMapping[fieldLower] !== field;
      
      return {
        field, // Nombre esperado original (ej: NRO_SICOP)
        mappedFieldName, // Nombre después del mapeo (ej: numeroCartel)
        isMapped, // ¿Existe la columna?
        wasMapped, // ¿Se aplicó mapeo?
        sourceColumn: wasMapped ? field : undefined
      };
    });
    
    // Solo campos que realmente faltan (ni están ni fueron mapeados)
    const missingRequired = requiredFieldsStatus
      .filter(status => !status.isMapped)
      .map(status => status.field);
    
    // Campos que fueron mapeados exitosamente
    const mappedRequired = requiredFieldsStatus
      .filter(status => status.isMapped && status.wasMapped);
    
    const extraFields = dataColumns
      .filter(c => {
        const name = c.mappedName || c.columnName;
        const inRequired = expectedSchema?.requiredFields?.includes(name);
        const inOptional = expectedSchema?.optionalFields?.includes(name);
        return !inRequired && !inOptional;
      })
      .map(c => c.columnName);
    
    // Calcular métricas de calidad (con info de mapeos)
    const qualityMetrics = this.calculateQualityScore(
      columns,
      missingRequired,
      mappedRequired,
      records.length
    );
    
    // Análisis temporal
    const temporalCoverage = this.extractTemporalCoverage(records);
    
    return {
      tableName,
      originalFileName: this.getOriginalFileName(tableName),
      totalRows: records.length,
      totalColumns: dataColumns.length,
      columns: [...dataColumns, ...metaColumns], // datos primero, meta al final
      headerMapping,
      unmappedColumns: extraFields,
      expectedSchema: expectedSchema ? {
        type: expectedSchema.type,
        requiredFields: expectedSchema.requiredFields,
        optionalFields: expectedSchema.optionalFields || []
      } : undefined,
      missingRequiredFields: missingRequired,
      extraFields,
      qualityScore: qualityMetrics.score,
      issues: qualityMetrics.issues,
      temporalCoverage
    };
  }
  
  /**
   * Analiza una columna individual
   */
  private analyzeColumn(
    columnName: string,
    records: any[],
    headerMapping: Record<string, string>
  ): ColumnInfo {
    const values = records.map(r => r[columnName]);
    const nonNullValues = values.filter(v => v != null && v !== '');
    
    // Detectar nombre mapeado
    const keyLower = columnName.trim().toLowerCase();
    const mappedName = headerMapping[keyLower] || headerMapping[columnName];
    
    // Detección de tipo
    const typeDetection = this.detectDataType(nonNullValues);
    
    // Estadísticas básicas
    const totalValues = values.length;
    const nullCount = totalValues - nonNullValues.length;
    const uniqueValues = _.uniq(nonNullValues);
    const uniqueCount = uniqueValues.length;
    
    const completeness = totalValues > 0 ? (nonNullValues.length / totalValues) * 100 : 0;
    const distinctness = nonNullValues.length > 0 ? (uniqueCount / nonNullValues.length) * 100 : 0;
    
    // Valores de muestra (aleatorios)
    const sampleValues = _.sampleSize(nonNullValues, Math.min(5, nonNullValues.length));
    
    // Top valores (para categóricos)
    const topValues = this.getTopValues(nonNullValues, 10);
    
    const columnInfo: ColumnInfo = {
      columnName,
      originalName: columnName,
      mappedName,
      dataType: typeDetection.type,
      confidence: typeDetection.confidence,
      totalValues,
      nullCount,
      uniqueCount,
      completeness,
      distinctness,
      sampleValues,
      topValues
    };
    
    // Estadísticas específicas por tipo
    if (typeDetection.type === 'number' || typeDetection.type === 'currency') {
      const numericStats = this.calculateNumericStats(nonNullValues);
      Object.assign(columnInfo, numericStats);
    }
    
    if (typeDetection.type === 'string') {
      const textStats = this.calculateTextStats(nonNullValues);
      Object.assign(columnInfo, textStats);
    }
    
    // Detectar patrones y problemas
    columnInfo.patterns = this.detectPatterns(nonNullValues, typeDetection.type);
    columnInfo.issues = this.detectIssues(columnInfo);
    
    return columnInfo;
  }
  
  /**
   * Detecta el tipo de dato de una columna
   */
  private detectDataType(values: any[]): { type: DataType; confidence: number } {
    if (values.length === 0) return { type: 'null', confidence: 1.0 };
    
    const sample = values.slice(0, Math.min(1000, values.length));
    
    // Contadores de tipos
    let numCount = 0;
    let dateCount = 0;
    let boolCount = 0;
    let strCount = 0;
    let currencyCount = 0;
    let percentageCount = 0;
    let idCount = 0;
    let codeCount = 0;
    
    for (const val of sample) {
      const str = String(val).trim();
      
      // Booleano
      if (/^(true|false|yes|no|si|no|1|0)$/i.test(str)) {
        boolCount++;
        continue;
      }
      
      // Moneda (₡, $, USD, CRC)
      if (/^[₡$]?[\d,]+\.?\d*\s*(CRC|USD|₡|\$)?$/i.test(str) && /\d/.test(str)) {
        currencyCount++;
        numCount++;
        continue;
      }
      
      // Porcentaje
      if (/^\d+\.?\d*\s*%$/.test(str)) {
        percentageCount++;
        numCount++;
        continue;
      }
      
      // Número
      if (!isNaN(Number(str)) && str !== '') {
        numCount++;
        continue;
      }
      
      // Fecha (varios formatos)
      if (this.isDate(str)) {
        dateCount++;
        continue;
      }
      
      // ID (dígitos con posibles guiones)
      if (/^\d{4,}-?\d*$/.test(str) || /^\d{9,}$/.test(str)) {
        idCount++;
        strCount++;
        continue;
      }
      
      // Código (letras y números)
      if (/^[A-Z0-9]{2,}-[A-Z0-9]+$/i.test(str) || /^[A-Z]{2,}\d+$/i.test(str)) {
        codeCount++;
        strCount++;
        continue;
      }
      
      strCount++;
    }
    
    const total = sample.length;
    const threshold = 0.8; // 80% de confianza
    
    // Decisión de tipo (orden de especificidad)
    if (dateCount / total > threshold) return { type: 'date', confidence: dateCount / total };
    if (boolCount / total > threshold) return { type: 'boolean', confidence: boolCount / total };
    if (currencyCount / total > threshold) return { type: 'currency', confidence: currencyCount / total };
    if (percentageCount / total > threshold) return { type: 'percentage', confidence: percentageCount / total };
    if (idCount / total > threshold) return { type: 'id', confidence: idCount / total };
    if (codeCount / total > threshold) return { type: 'code', confidence: codeCount / total };
    if (numCount / total > threshold) return { type: 'number', confidence: numCount / total };
    if (strCount / total > threshold) return { type: 'string', confidence: strCount / total };
    
    // Tipo mixto
    return { type: 'mixed', confidence: 0.5 };
  }
  
  /**
   * Verifica si un string es una fecha válida
   */
  private isDate(str: string): boolean {
    // DD/MM/YYYY o DD-MM-YYYY
    if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(str)) return true;
    
    // YYYY-MM-DD
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(str)) return true;
    
    // ISO 8601
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str)) return true;
    
    // Intentar parsear
    const date = new Date(str);
    return !isNaN(date.getTime());
  }
  
  /**
   * Calcula estadísticas numéricas
   */
  private calculateNumericStats(values: any[]): Partial<ColumnInfo> {
    const numbers = values
      .map(v => {
        const str = String(v).replace(/[₡$,\s%CRCUSDcrcusd]/g, '');
        return parseFloat(str);
      })
      .filter(n => !isNaN(n) && isFinite(n));
    
    if (numbers.length === 0) return {};
    
    const sorted = _.sortBy(numbers);
    const sum = _.sum(numbers);
    const mean = sum / numbers.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    
    // Desviación estándar
    const variance = _.sumBy(numbers, n => Math.pow(n - mean, 2)) / numbers.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      min: _.min(numbers),
      max: _.max(numbers),
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100
    };
  }
  
  /**
   * Calcula estadísticas de texto
   */
  private calculateTextStats(values: any[]): Partial<ColumnInfo> {
    const strings = values.map(v => String(v));
    const lengths = strings.map(s => s.length);
    
    return {
      minLength: _.min(lengths),
      maxLength: _.max(lengths),
      avgLength: Math.round(_.mean(lengths) * 100) / 100
    };
  }
  
  /**
   * Obtiene los valores más frecuentes
   */
  private getTopValues(
    values: any[],
    limit: number
  ): Array<{ value: any; count: number; percentage: number }> {
    const counts = _.countBy(values);
    const sorted = _.orderBy(
      Object.entries(counts),
      ([, count]) => count,
      'desc'
    );
    
    const total = values.length;
    
    return sorted.slice(0, limit).map(([value, count]) => ({
      value,
      count,
      percentage: Math.round((count / total) * 10000) / 100
    }));
  }
  
  /**
   * Detecta patrones en los datos
   */
  private detectPatterns(values: any[], dataType: DataType): string[] {
    const patterns: string[] = [];
    const sample = values.slice(0, Math.min(100, values.length));
    
    // Patrones por tipo
    if (dataType === 'id' || dataType === 'code') {
      const lengths = sample.map(v => String(v).length);
      const uniqueLengths = _.uniq(lengths);
      
      if (uniqueLengths.length === 1) {
        patterns.push(`Longitud fija: ${uniqueLengths[0]} caracteres`);
      } else {
        patterns.push(`Longitud variable: ${_.min(lengths)}-${_.max(lengths)} caracteres`);
      }
    }
    
    if (dataType === 'string') {
      const hasUpperCase = sample.some(v => /[A-Z]/.test(String(v)));
      const hasLowerCase = sample.some(v => /[a-z]/.test(String(v)));
      const hasNumbers = sample.some(v => /\d/.test(String(v)));
      
      if (hasUpperCase && !hasLowerCase) patterns.push('Solo mayúsculas');
      if (hasLowerCase && !hasUpperCase) patterns.push('Solo minúsculas');
      if (hasNumbers) patterns.push('Contiene números');
    }
    
    if (dataType === 'date') {
      // Detectar formato de fecha predominante
      const formats: Record<string, number> = {};
      
      sample.forEach(v => {
        const str = String(v);
        if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(str)) formats['DD/MM/YYYY'] = (formats['DD/MM/YYYY'] || 0) + 1;
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) formats['YYYY-MM-DD'] = (formats['YYYY-MM-DD'] || 0) + 1;
        if (/^\d{4}-\d{2}-\d{2}T/.test(str)) formats['ISO 8601'] = (formats['ISO 8601'] || 0) + 1;
      });
      
      const dominantFormat = _.maxBy(Object.entries(formats), ([, count]) => count);
      if (dominantFormat) {
        patterns.push(`Formato predominante: ${dominantFormat[0]}`);
      }
    }
    
    return patterns;
  }
  
  /**
   * Detecta problemas de calidad en una columna
   */
  private detectIssues(column: ColumnInfo): string[] {
    const issues: string[] = [];
    
    // Completitud baja
    if (column.completeness < 50) {
      issues.push(`Completitud baja: ${column.completeness.toFixed(1)}% de valores no nulos`);
    }
    
    // Muchos valores únicos (posible problema de normalización)
    if (column.distinctness > 95 && column.totalValues > 100) {
      issues.push('Alta cardinalidad: casi todos los valores son únicos');
    }
    
    // Pocos valores únicos (posible campo categórico)
    if (column.uniqueCount <= 10 && column.totalValues > 100) {
      issues.push(`Campo categórico: solo ${column.uniqueCount} valores distintos`);
    }
    
    // Tipo mixto (problema)
    if (column.dataType === 'mixed') {
      issues.push('Tipo de dato mixto o inconsistente');
    }
    
    // Baja confianza en tipo
    if (column.confidence < 0.7) {
      issues.push(`Baja confianza en tipo detectado: ${(column.confidence * 100).toFixed(0)}%`);
    }
    
    return issues;
  }
  
  /**
   * Extrae todos los nombres de columnas
   */
  private extractAllColumnNames(records: any[]): string[] {
    const allColumns = new Set<string>();
    
    records.forEach(record => {
      Object.keys(record).forEach(key => allColumns.add(key));
    });
    
    return Array.from(allColumns).sort();
  }
  
  /**
   * Calcula un score de calidad general
   */
  private calculateQualityScore(
    columns: ColumnInfo[],
    missingRequired: string[],
    mappedRequired: Array<{ field: string; mappedFieldName: string; wasMapped: boolean; sourceColumn?: string }>,
    totalRows: number
  ): { score: number; issues: Array<{ severity: 'error' | 'warning' | 'info'; column?: string; message: string }> } {
    const issues: Array<{ severity: 'error' | 'warning' | 'info'; column?: string; message: string }> = [];
    let score = 100;
    
    // Campos requeridos que realmente faltan (ERROR)
    if (missingRequired.length > 0) {
      score -= missingRequired.length * 10;
      missingRequired.forEach(field => {
        issues.push({
          severity: 'error',
          message: `❌ Campo requerido faltante: ${field} (no existe ni mapeado)`
        });
      });
    }
    
    // Campos requeridos que fueron mapeados exitosamente (INFO)
    mappedRequired.forEach(item => {
      issues.push({
        severity: 'info',
        message: `✅ Transformación aplicada: "${item.sourceColumn}" → "${item.mappedFieldName}" (campo requerido mapeado correctamente)`
      });
    });
    
    // Completitud de columnas
    columns.forEach(col => {
      if (col.completeness < 50) {
        score -= 5;
        issues.push({
          severity: 'warning',
          column: col.columnName,
          message: `Baja completitud (${col.completeness.toFixed(1)}%)`
        });
      }
      
      if (col.dataType === 'mixed') {
        score -= 3;
        issues.push({
          severity: 'warning',
          column: col.columnName,
          message: 'Tipo de dato inconsistente'
        });
      }
    });
    
    // Pocos registros
    if (totalRows < 10) {
      score -= 20;
      issues.push({
        severity: 'warning',
        message: `Muy pocos registros: ${totalRows}`
      });
    }
    
    return {
      score: Math.max(0, Math.min(100, score)),
      issues
    };
  }
  
  /**
   * Extrae cobertura temporal de metadatos
   */
  private extractTemporalCoverage(records: any[]): {
    years: string[];
    months: string[];
    files: string[];
  } | undefined {
    const years = new Set<string>();
    const months = new Set<string>();
    const files = new Set<string>();
    
    records.forEach(record => {
      if (record._YEAR) years.add(String(record._YEAR));
      if (record._MONTH) months.add(String(record._MONTH));
      if (record._FILE_SOURCE) files.add(String(record._FILE_SOURCE));
    });
    
    if (years.size === 0 && months.size === 0 && files.size === 0) {
      return undefined;
    }
    
    return {
      years: Array.from(years).sort(),
      months: Array.from(months).sort(),
      files: Array.from(files).sort()
    };
  }
  
  /**
   * Obtiene el nombre del archivo CSV original
   */
  private getOriginalFileName(tableName: string): string {
    const mapping: Record<string, string> = {
      'InstitucionesRegistradas': 'InstitucionesRegistradas.csv',
      'Proveedores': 'Proveedores_unido.csv',
      'DetalleCarteles': 'DetalleCarteles.csv',
      'DetalleLineaCartel': 'DetalleLineaCartel.csv',
      'FechaPorEtapas': 'FechaPorEtapas.csv',
      'Ofertas': 'Ofertas.csv',
      'LineasOfertadas': 'LineasOfertadas.csv',
      'LineasRecibidas': 'LineasRecibidas.csv',
      'LineasAdjudicadas': 'LineasAdjudicadas.csv',
      'AdjudicacionesFirme': 'AdjudicacionesFirme.csv',
      'Contratos': 'Contratos.csv',
      'LineasContratadas': 'LineasContratadas.csv',
      'OrdenPedido': 'OrdenPedido.csv',
      'Recepciones': 'Recepciones.csv',
      'Garantias': 'Garantias.csv',
      'RecursosObjecion': 'RecursosObjecion.csv',
      'SancionProveedores': 'SancionProveedores.csv',
      'InvitacionProcedimiento': 'InvitacionProcedimiento.csv',
      'ProcedimientoAdjudicacion': 'ProcedimientoAdjudicacion.csv',
      'ProcedimientoADM': 'ProcedimientoADM.csv',
      'Sistemas': 'Sistemas.csv',
      'SistemaEvaluacionOfertas': 'SistemaEvaluacionOfertas.csv',
      'ReajustePrecios': 'ReajustePrecios.csv',
      'FuncionariosInhibicion': 'FuncionariosInhibicion.csv',
      'Remates': 'Remates.csv'
    };
    
    return mapping[tableName] || `${tableName}.csv`;
  }
  
  /**
   * Genera un reporte de texto completo
   */
  async generateFullReport(): Promise<string> {
    const analyses = await this.analyzeAllFiles();
    
    let report = '═══════════════════════════════════════════════════════\n';
    report += '   REPORTE DE ANÁLISIS DE SCHEMAS - SISTEMA SICOP\n';
    report += '═══════════════════════════════════════════════════════\n\n';
    report += `Fecha de generación: ${new Date().toLocaleString('es-CR')}\n`;
    report += `Total de tablas analizadas: ${analyses.length}\n`;
    report += `Total de registros: ${_.sumBy(analyses, 'totalRows').toLocaleString()}\n\n`;
    
    analyses.forEach((analysis, index) => {
      report += `\n${'─'.repeat(60)}\n`;
      report += `${index + 1}. ${analysis.tableName}\n`;
      report += `${'─'.repeat(60)}\n`;
      report += `Archivo: ${analysis.originalFileName}\n`;
      report += `Registros: ${analysis.totalRows.toLocaleString()}\n`;
      report += `Columnas: ${analysis.totalColumns}\n`;
      report += `Calidad: ${analysis.qualityScore.toFixed(0)}%\n\n`;
      
      // Schema esperado
      if (analysis.expectedSchema) {
        report += `Schema Esperado:\n`;
        report += `  Campos requeridos: ${analysis.expectedSchema.requiredFields.join(', ')}\n`;
        if (analysis.missingRequiredFields.length > 0) {
          report += `  ⚠️  Faltantes: ${analysis.missingRequiredFields.join(', ')}\n`;
        }
      }
      
      report += `\nColumnas:\n`;
      analysis.columns.forEach(col => {
        const mapped = col.mappedName ? ` → ${col.mappedName}` : '';
        report += `  • ${col.columnName}${mapped}\n`;
        report += `    Tipo: ${col.dataType} (${(col.confidence * 100).toFixed(0)}% confianza)\n`;
        report += `    Completitud: ${col.completeness.toFixed(1)}% | Únicos: ${col.uniqueCount.toLocaleString()}\n`;
        
        if (col.min !== undefined) {
          report += `    Rango: ${col.min.toLocaleString()} - ${col.max?.toLocaleString()}\n`;
          report += `    Promedio: ${col.mean?.toLocaleString()} | Mediana: ${col.median?.toLocaleString()}\n`;
        }
        
        if (col.issues && col.issues.length > 0) {
          report += `    ⚠️  ${col.issues.join('; ')}\n`;
        }
      });
      
      // Issues generales
      if (analysis.issues.length > 0) {
        report += `\nProblemas detectados:\n`;
        analysis.issues.forEach(issue => {
          const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
          report += `  ${icon} ${issue.message}`;
          if (issue.column) report += ` (${issue.column})`;
          report += `\n`;
        });
      }
    });
    
    report += `\n${'═'.repeat(60)}\n`;
    report += 'Fin del reporte\n';
    report += `${'═'.repeat(60)}\n`;
    
    return report;
  }
}

export const schemaAnalysisService = new SchemaAnalysisService();
