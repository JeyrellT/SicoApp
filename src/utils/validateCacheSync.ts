/**
 * Script de validación: Cache ↔ DataManager
 * 
 * Uso desde consola del navegador:
 * ```javascript
 * // Importar el script
 * import('./utils/validateCacheSync').then(m => m.runValidation());
 * ```
 */

import { cacheDataManagerSync } from '../services/CacheDataManagerSync';
import { cacheService } from '../services/CacheService';
import { dataLoaderService } from '../services/DataLoaderService';

/**
 * Ejecuta validación completa del sistema de cache
 */
export async function runValidation() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 VALIDACIÓN DE SINCRONIZACIÓN CACHE ↔ DATAMANAGER');
  console.log('='.repeat(80) + '\n');

  try {
    // 1. Verificar que hay datos en cache
    const hasData = await dataLoaderService.hasDataInCache();
    
    if (!hasData) {
      console.error('❌ No hay datos en cache. Sube archivos primero.');
      return;
    }

    console.log('✅ Datos encontrados en cache\n');

    // 2. Obtener estadísticas básicas
    console.log('📊 ESTADÍSTICAS DE CACHE');
    console.log('-'.repeat(80));
    const cacheStats = await dataLoaderService.getCacheStats();
    console.log(`  • Archivos totales: ${cacheStats.totalFiles}`);
    console.log(`  • Registros totales: ${cacheStats.totalRecords.toLocaleString()}`);
    console.log(`  • Años: ${cacheStats.years.join(', ')}`);
    console.log(`  • Tipos: ${cacheStats.types.length} tipos diferentes`);
    console.log('');

    // 3. Generar reporte completo
    const report = await cacheDataManagerSync.generateSyncReport();

    // 4. Mostrar estadísticas de uso detalladas
    console.log('📈 ESTADÍSTICAS DETALLADAS');
    console.log('-'.repeat(80));
    const usageStats = await cacheDataManagerSync.getCacheUsageStats();
    console.log(`  • Tamaño estimado: ${usageStats.sizeEstimateMB} MB`);
    console.log(`  • Años con datos: ${usageStats.temporalCoverage.years.join(', ')}`);
    console.log(`  • Meses con datos: ${usageStats.temporalCoverage.months.join(', ')}`);
    console.log('');

    console.log('📦 DISTRIBUCIÓN POR TIPO');
    console.log('-'.repeat(80));
    const topTypes = Object.entries(usageStats.typeDistribution)
      .sort((a, b) => b[1].records - a[1].records)
      .slice(0, 10);
    
    topTypes.forEach(([type, stats], index) => {
      console.log(
        `  ${index + 1}. ${type.padEnd(30)} ` +
        `${stats.files.toString().padStart(3)} archivos | ` +
        `${stats.records.toLocaleString().padStart(10)} registros`
      );
    });
    console.log('');

    // 5. Mapeo de tipos
    console.log('🗺️ MAPEO DE TIPOS');
    console.log('-'.repeat(80));
    const typeMapping = await cacheDataManagerSync.getTypeMappingStatus();
    
    const mappingEntries = Object.entries(typeMapping);
    const inCacheTypes = mappingEntries.filter(([_, info]) => info.inCache);
    const supportedTypes = mappingEntries.filter(([_, info]) => info.supported && info.inCache);
    const unsupportedTypes = mappingEntries.filter(([_, info]) => info.inCache && !info.supported);
    const missingTypes = mappingEntries.filter(([_, info]) => info.supported && !info.inCache);

    console.log(`  ✅ Tipos soportados en cache: ${supportedTypes.length}`);
    console.log(`  ⚠️ Tipos no soportados en cache: ${unsupportedTypes.length}`);
    console.log(`  📥 Tipos faltantes: ${missingTypes.length}`);
    console.log('');

    if (unsupportedTypes.length > 0) {
      console.log('  ⚠️ Tipos no soportados:');
      unsupportedTypes.forEach(([type, info]) => {
        console.log(`    • ${type} (${info.recordsCount.toLocaleString()} registros)`);
      });
      console.log('');
    }

    if (missingTypes.length > 0) {
      console.log('  📥 Tipos que deberían subirse:');
      missingTypes.slice(0, 10).forEach(([type]) => {
        console.log(`    • ${type}`);
      });
      console.log('');
    }

    // 6. Resultado final
    console.log('🎯 RESULTADO FINAL');
    console.log('-'.repeat(80));
    
    if (report.validation.isValid && report.integrity.isHealthy) {
      console.log('  ✅ SISTEMA COMPLETAMENTE SINCRONIZADO');
      console.log('  ✅ Cache y DataManager están alineados correctamente');
      console.log('  ✅ Todos los datos se cargarán sin problemas');
    } else if (report.validation.isValid && !report.integrity.isHealthy) {
      console.log('  ⚠️ VALIDACIÓN EXITOSA CON ADVERTENCIAS');
      console.log('  ✅ Estructura correcta');
      console.log('  ⚠️ Hay algunos issues de integridad (ver recomendaciones)');
    } else {
      console.log('  ❌ PROBLEMAS DETECTADOS');
      console.log('  ❌ Revisar errores y warnings');
    }
    console.log('');

    if (report.recommendations.length > 0) {
      console.log('💡 RECOMENDACIONES');
      console.log('-'.repeat(80));
      report.recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec}`);
      });
      console.log('');
    }

    console.log('='.repeat(80));
    console.log('✅ Validación completada');
    console.log('='.repeat(80) + '\n');

    return report;

  } catch (error) {
    console.error('❌ Error durante la validación:', error);
    throw error;
  }
}

/**
 * Muestra solo un resumen rápido
 */
export async function quickCheck() {
  console.log('🔍 Verificación rápida...\n');

  const hasData = await dataLoaderService.hasDataInCache();
  if (!hasData) {
    console.log('❌ No hay datos en cache');
    return false;
  }

  const stats = await dataLoaderService.getCacheStats();
  const validation = await cacheDataManagerSync.validateCacheDataManagerSync();

  console.log(`📊 Archivos: ${stats.totalFiles}`);
  console.log(`📊 Registros: ${stats.totalRecords.toLocaleString()}`);
  console.log(`📊 Tipos: ${stats.types.length}`);
  console.log(`✅ Validación: ${validation.isValid ? 'OK' : 'CON PROBLEMAS'}`);
  console.log('');

  return validation.isValid;
}

/**
 * Exponer funciones globalmente para uso en consola
 */
if (typeof window !== 'undefined') {
  (window as any).validateCacheSync = {
    runValidation,
    quickCheck,
    cacheDataManagerSync,
  };
  
  console.log('💡 Funciones de validación disponibles en window.validateCacheSync');
  console.log('   • window.validateCacheSync.runValidation()');
  console.log('   • window.validateCacheSync.quickCheck()');
}

export default { runValidation, quickCheck };
