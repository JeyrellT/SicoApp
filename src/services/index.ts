/**
 * Index de servicios de Cache
 * Exporta todos los servicios relacionados con el sistema de cache
 */

export { cacheService } from './CacheService';
export { consolidationService } from './DataConsolidationService';
export { dataLoaderService } from './DataLoaderService';
export { cacheDataManagerSync } from './CacheDataManagerSync';

export type { ConsolidationOptions, ConsolidatedResult } from './DataConsolidationService';
export type { SyncValidationResult, CacheIntegrityResult } from './CacheDataManagerSync';

/**
 * Guía de uso de servicios de Cache:
 * 
 * 1. CacheService: 
 *    - Manejo de bajo nivel de IndexedDB
 *    - Guardar/recuperar archivos CSV individuales
 *    - Gestión de metadatos
 * 
 * 2. DataConsolidationService:
 *    - Consolidar datos de múltiples archivos
 *    - Filtrar por año, mes, tipo
 *    - Deduplicación SOLO si se solicita explícitamente
 *    - Exportar a CSV
 * 
 * 3. DataLoaderService:
 *    - Cargar datos del cache al DataManager
 *    - Consolidación automática por tipo
 *    - SIN deduplicación (datos ya limpios)
 *    - Progreso de carga
 * 
 * 4. CacheDataManagerSync:
 *    - Validar sincronización entre cache y DataManager
 *    - Verificar integridad de datos
 *    - Generar reportes de estado
 *    - Detectar problemas antes de cargar
 * 
 * Flujo típico:
 * 
 * // 1. Validar estado del cache
 * const report = await cacheDataManagerSync.generateSyncReport();
 * 
 * if (!report.validation.isValid) {
 *   console.error('Problemas detectados:', report.validation.errors);
 *   return;
 * }
 * 
 * // 2. Cargar datos al DataManager
 * await dataLoaderService.loadDataFromCache({
 *   years: [2024, 2025],
 *   onProgress: (progress) => {
 *     console.log(`${progress.stage}: ${progress.percentage}%`);
 *   }
 * });
 * 
 * // 3. O consolidar datos para análisis específico
 * const result = await consolidationService.consolidateByYear(2024, {
 *   types: ['Contratos', 'Proveedores']
 * });
 * 
 * ⚠️ IMPORTANTE:
 * - Los datos en cache ya están limpios (no tienen duplicados)
 * - NO se deduplica automáticamente durante la carga
 * - Deduplicación solo si se solicita explícitamente con deduplicateBy
 * - Los nombres de columnas en cache son los ORIGINALES del CSV
 * - DataManager mapea los nombres después de cargar
 */
