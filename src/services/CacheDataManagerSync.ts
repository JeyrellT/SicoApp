/**
 * CacheDataManagerSync - Servicio de validación y sincronización
 * Asegura que los datos en cache estén alineados con DataManager
 */

import { cacheService } from './CacheService';
import { MAPEO_ARCHIVOS } from '../data/relations';

interface SyncValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  stats: {
    expectedTypes: string[];
    cachedTypes: string[];
    missingTypes: string[];
    extraTypes: string[];
    totalCachedRecords: number;
    typeBreakdown: Record<string, number>;
  };
}

interface CacheIntegrityResult {
  isHealthy: boolean;
  issues: {
    duplicateKeys: Array<{ type: string; key: string; count: number }>;
    missingRequiredFields: Array<{ type: string; field: string; recordsAffected: number }>;
    invalidDataTypes: Array<{ type: string; field: string; recordsAffected: number }>;
  };
  recommendations: string[];
}

class CacheDataManagerSyncService {
  /**
   * Tipos de archivo que DataManager espera y puede procesar
   * Basado en MAPEO_ARCHIVOS de relations.ts
   */
  private readonly EXPECTED_TYPES = Object.values(MAPEO_ARCHIVOS);

  /**
   * Campos clave para deduplicación por tipo de archivo
   * DEBE coincidir exactamente con DataLoaderService
   */
  private readonly KEY_FIELDS: Record<string, string[]> = {
    'Contratos': ['NumeroContrato'],
    'Proveedores': ['Cedula', 'idProveedor'],
    'LineasContratadas': ['NumeroContrato', 'NumeroLinea'],
    'LineasAdjudicadas': ['NumeroCartel', 'NumeroLinea'],
    'DetalleCarteles': ['NumeroCartel'],
    'ProcedimientoAdjudicacion': ['NumeroCartel'],
    'InstitucionesRegistradas': ['CodigoInstitucion'],
    'Ofertas': ['NumeroCartel', 'IdProveedor'],
    'AdjudicacionesFirme': ['NumeroCartel', 'NumeroLinea'],
    'DetalleLineaCartel': ['NumeroCartel', 'NumeroLinea'],
    'FechaPorEtapas': ['NumeroCartel', 'Etapa'],
    'FuncionariosInhibicion': ['Cedula'],
    'Garantias': ['NumeroContrato', 'TipoGarantia'],
    'InvitacionProcedimiento': ['NumeroCartel', 'IdProveedor'],
    'LineasOfertadas': ['NumeroCartel', 'NumeroLinea', 'IdProveedor'],
    'LineasRecibidas': ['NumeroCartel', 'NumeroLinea'],
    'OrdenPedido': ['NumeroOrden'],
    'ProcedimientoADM': ['NumeroCartel'],
    'Recepciones': ['NumeroContrato', 'NumeroRecepcion'],
    'ReajustePrecios': ['NumeroContrato', 'Periodo'],
    'RecursosObjecion': ['NumeroCartel', 'IdRecurso'],
    'Remates': ['NumeroRemate'],
    'SancionProveedores': ['Cedula', 'FechaSancion'],
    'Sistemas': ['CodigoSistema'],
    'SistemaEvaluacionOfertas': ['NumeroCartel'],
  };

  /**
   * Campos obligatorios que deben tener metadatos cuando se guardan en cache
   */
  private readonly METADATA_FIELDS = ['_YEAR', '_MONTH', '_FILE_SOURCE', '_UPLOAD_DATE'];

  /**
   * Valida que los datos en cache sean compatibles con DataManager
   */
  async validateCacheDataManagerSync(): Promise<SyncValidationResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    console.log('🔍 Validando sincronización Cache ↔ DataManager...');

    // Obtener metadatos del cache
    const metadata = await cacheService.getMetadata();
    
    // Obtener tipos únicos en cache
    const cachedTypes = [...new Set(metadata.files.map(f => f.type))].sort();
    
    // Comparar con tipos esperados por DataManager
    const expectedTypes = this.EXPECTED_TYPES.sort();
    const missingTypes = expectedTypes.filter(t => !cachedTypes.includes(t));
    const extraTypes = cachedTypes.filter(t => !expectedTypes.includes(t));

    // Calcular estadísticas por tipo
    const typeBreakdown: Record<string, number> = {};
    metadata.files.forEach(f => {
      typeBreakdown[f.type] = (typeBreakdown[f.type] || 0) + f.recordCount;
    });

    // Generar warnings y errores
    if (missingTypes.length > 0) {
      warnings.push(`Tipos de archivo faltantes en cache: ${missingTypes.join(', ')}`);
      warnings.push('DataManager puede generar fallbacks para algunos tipos faltantes (ej: Proveedores)');
    }

    if (extraTypes.length > 0) {
      warnings.push(`Tipos de archivo en cache no reconocidos por DataManager: ${extraTypes.join(', ')}`);
      warnings.push('Estos archivos serán ignorados durante la carga');
    }

    // Validar campos clave de deduplicación
    for (const type of cachedTypes) {
      if (!this.KEY_FIELDS[type]) {
        warnings.push(`Tipo "${type}" no tiene campos clave definidos para deduplicación`);
      }
    }

    const isValid = errors.length === 0;

    console.log(isValid ? '✅ Validación exitosa' : '❌ Validación con errores');
    console.log(`📊 Tipos en cache: ${cachedTypes.length} | Tipos esperados: ${expectedTypes.length}`);
    
    return {
      isValid,
      warnings,
      errors,
      stats: {
        expectedTypes,
        cachedTypes,
        missingTypes,
        extraTypes,
        totalCachedRecords: metadata.totalRecords,
        typeBreakdown,
      },
    };
  }

  /**
   * Verifica la integridad de los datos en cache
   * Detecta duplicados, campos faltantes y tipos de datos inválidos
   */
  async checkCacheIntegrity(): Promise<CacheIntegrityResult> {
    console.log('🔎 Verificando integridad de datos en cache...');

    const metadata = await cacheService.getMetadata();
    const issues = {
      duplicateKeys: [] as Array<{ type: string; key: string; count: number }>,
      missingRequiredFields: [] as Array<{ type: string; field: string; recordsAffected: number }>,
      invalidDataTypes: [] as Array<{ type: string; field: string; recordsAffected: number }>,
    };
    const recommendations: string[] = [];

    // Agrupar archivos por tipo
    const filesByType = new Map<string, typeof metadata.files>();
    metadata.files.forEach(f => {
      if (!filesByType.has(f.type)) {
        filesByType.set(f.type, []);
      }
      filesByType.get(f.type)!.push(f);
    });

    // Verificar cada tipo
    for (const [type, files] of filesByType.entries()) {
      console.log(`  📁 Verificando ${type}...`);

      // Cargar todos los archivos de este tipo
      const allData: any[] = [];
      for (const fileInfo of files) {
        const fileData = await cacheService.getFile(fileInfo.id);
        if (fileData && fileData.data) {
          allData.push(...fileData.data);
        }
      }

      if (allData.length === 0) continue;

      // Verificar campos clave
      const keyFields = this.KEY_FIELDS[type];
      if (keyFields) {
        // Detectar duplicados
        const keyMap = new Map<string, number>();
        allData.forEach(record => {
          const key = keyFields.map(f => String(record[f] || '')).join('|');
          keyMap.set(key, (keyMap.get(key) || 0) + 1);
        });

        const duplicates = Array.from(keyMap.entries()).filter(([_, count]) => count > 1);
        if (duplicates.length > 0) {
          duplicates.forEach(([key, count]) => {
            issues.duplicateKeys.push({ type, key, count });
          });
          recommendations.push(`Ejecutar deduplicación en tipo "${type}" (${duplicates.length} claves duplicadas)`);
        }

        // Verificar campos clave faltantes
        keyFields.forEach(field => {
          const missing = allData.filter(r => !r[field] || String(r[field]).trim() === '');
          if (missing.length > 0) {
            issues.missingRequiredFields.push({ type, field, recordsAffected: missing.length });
          }
        });
      }

      // Verificar campos de metadatos
      this.METADATA_FIELDS.forEach(metaField => {
        const missing = allData.filter(r => !r[metaField]);
        if (missing.length > 0) {
          issues.missingRequiredFields.push({ 
            type, 
            field: metaField, 
            recordsAffected: missing.length 
          });
          
          if (missing.length === allData.length) {
            recommendations.push(
              `CRÍTICO: Tipo "${type}" no tiene campos de metadatos. ` +
              `Estos datos pueden no haberse guardado correctamente en cache.`
            );
          }
        }
      });
    }

    const isHealthy = issues.duplicateKeys.length === 0 && 
                     issues.missingRequiredFields.length === 0 &&
                     issues.invalidDataTypes.length === 0;

    console.log(isHealthy ? '✅ Cache íntegro' : '⚠️ Issues detectados en cache');

    return {
      isHealthy,
      issues,
      recommendations,
    };
  }

  /**
   * Genera un reporte completo de sincronización
   */
  async generateSyncReport(): Promise<{
    validation: SyncValidationResult;
    integrity: CacheIntegrityResult;
    recommendations: string[];
  }> {
    console.log('\n📋 === REPORTE DE SINCRONIZACIÓN CACHE ↔ DATAMANAGER ===\n');

    const validation = await this.validateCacheDataManagerSync();
    const integrity = await this.checkCacheIntegrity();

    const recommendations: string[] = [];

    // Recomendaciones basadas en validación
    if (validation.stats.missingTypes.length > 0) {
      recommendations.push(
        '📥 Subir archivos CSV para los tipos faltantes: ' + 
        validation.stats.missingTypes.join(', ')
      );
    }

    if (validation.stats.extraTypes.length > 0) {
      recommendations.push(
        '🗑️ Considerar remover tipos no reconocidos del cache: ' + 
        validation.stats.extraTypes.join(', ')
      );
    }

    // Recomendaciones basadas en integridad
    if (!integrity.isHealthy) {
      recommendations.push(...integrity.recommendations);
    }

    // Recomendaciones generales
    if (validation.isValid && integrity.isHealthy) {
      recommendations.push('✅ Cache y DataManager están perfectamente sincronizados');
      recommendations.push('🚀 Puede cargar datos con confianza usando DataLoaderService');
    }

    // Imprimir resumen
    console.log('\n📊 RESUMEN:');
    console.log(`  • Tipos en cache: ${validation.stats.cachedTypes.length}`);
    console.log(`  • Tipos esperados: ${validation.stats.expectedTypes.length}`);
    console.log(`  • Registros totales: ${validation.stats.totalCachedRecords.toLocaleString()}`);
    console.log(`  • Validación: ${validation.isValid ? '✅' : '❌'}`);
    console.log(`  • Integridad: ${integrity.isHealthy ? '✅' : '⚠️'}`);

    if (validation.warnings.length > 0) {
      console.log('\n⚠️ ADVERTENCIAS:');
      validation.warnings.forEach(w => console.log(`  • ${w}`));
    }

    if (validation.errors.length > 0) {
      console.log('\n❌ ERRORES:');
      validation.errors.forEach(e => console.log(`  • ${e}`));
    }

    if (recommendations.length > 0) {
      console.log('\n💡 RECOMENDACIONES:');
      recommendations.forEach(r => console.log(`  • ${r}`));
    }

    console.log('\n' + '='.repeat(60) + '\n');

    return {
      validation,
      integrity,
      recommendations,
    };
  }

  /**
   * Verifica que un tipo de archivo específico sea compatible
   */
  isTypeSupported(type: string): boolean {
    return this.EXPECTED_TYPES.includes(type);
  }

  /**
   * Obtiene los campos clave para un tipo específico
   */
  getKeyFieldsForType(type: string): string[] | undefined {
    return this.KEY_FIELDS[type];
  }

  /**
   * Valida que un registro tenga todos los campos de metadatos requeridos
   */
  hasRequiredMetadata(record: any): boolean {
    return this.METADATA_FIELDS.every(field => record[field] !== undefined);
  }

  /**
   * Obtiene estadísticas de uso del cache
   */
  async getCacheUsageStats(): Promise<{
    totalFiles: number;
    totalRecords: number;
    sizeEstimateMB: number;
    typeDistribution: Record<string, { files: number; records: number }>;
    temporalCoverage: {
      years: number[];
      months: number[];
      yearMonthCombinations: Array<{ year: number; month: number; files: number }>;
    };
  }> {
    const metadata = await cacheService.getMetadata();

    const typeDistribution: Record<string, { files: number; records: number }> = {};
    const yearSet = new Set<number>();
    const monthSet = new Set<number>();
    const yearMonthMap = new Map<string, number>();

    metadata.files.forEach(f => {
      // Distribución por tipo
      if (!typeDistribution[f.type]) {
        typeDistribution[f.type] = { files: 0, records: 0 };
      }
      typeDistribution[f.type].files++;
      typeDistribution[f.type].records += f.recordCount;

      // Cobertura temporal
      yearSet.add(f.year);
      monthSet.add(f.month);
      const ymKey = `${f.year}-${f.month}`;
      yearMonthMap.set(ymKey, (yearMonthMap.get(ymKey) || 0) + 1);
    });

    const yearMonthCombinations = Array.from(yearMonthMap.entries())
      .map(([key, files]) => {
        const [year, month] = key.split('-').map(Number);
        return { year, month, files };
      })
      .sort((a, b) => a.year - b.year || a.month - b.month);

    // Estimar tamaño total
    const totalSize = metadata.files.reduce((sum, f) => sum + f.size, 0);
    const sizeEstimateMB = totalSize / (1024 * 1024);

    return {
      totalFiles: metadata.files.length,
      totalRecords: metadata.totalRecords,
      sizeEstimateMB: Math.round(sizeEstimateMB * 100) / 100,
      typeDistribution,
      temporalCoverage: {
        years: Array.from(yearSet).sort(),
        months: Array.from(monthSet).sort(),
        yearMonthCombinations,
      },
    };
  }

  /**
   * Compara tipos en cache vs tipos esperados y retorna un mapeo
   */
  async getTypeMappingStatus(): Promise<{
    [type: string]: {
      inCache: boolean;
      supported: boolean;
      filesCount: number;
      recordsCount: number;
      hasKeyFields: boolean;
    };
  }> {
    const metadata = await cacheService.getMetadata();
    const allTypes = new Set([...this.EXPECTED_TYPES, ...metadata.files.map(f => f.type)]);

    const mapping: Record<string, any> = {};

    for (const type of allTypes) {
      const filesOfType = metadata.files.filter(f => f.type === type);
      const recordsCount = filesOfType.reduce((sum, f) => sum + f.recordCount, 0);

      mapping[type] = {
        inCache: filesOfType.length > 0,
        supported: this.isTypeSupported(type),
        filesCount: filesOfType.length,
        recordsCount,
        hasKeyFields: this.KEY_FIELDS[type] !== undefined,
      };
    }

    return mapping;
  }
}

export const cacheDataManagerSync = new CacheDataManagerSyncService();
export type { SyncValidationResult, CacheIntegrityResult };
