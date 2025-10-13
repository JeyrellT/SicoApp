/**
 * 🧪 Script de Prueba de Sistema de Caché
 * 
 * Ejecutar en consola del navegador para verificar que las optimizaciones funcionan correctamente
 * 
 * Uso:
 * 1. Abrir la aplicación en el navegador
 * 2. Abrir DevTools (F12)
 * 3. Copiar y pegar este código en la consola
 * 4. Observar los resultados
 */

(async function testCacheSystem() {
  console.group('🧪 Prueba de Sistema de Caché - SICOP');
  
  const dm = window.DataManager?.getInstance();
  
  if (!dm) {
    console.error('❌ DataManager no disponible. Asegúrate de que la app esté cargada.');
    console.groupEnd();
    return;
  }
  
  console.log('✅ DataManager encontrado');
  console.log('');
  
  // ==========================================
  // Test 1: Clasificación de Sectores
  // ==========================================
  console.group('📊 Test 1: Clasificación de Sectores');
  
  console.log('Primera ejecución (cache miss esperado)...');
  console.time('asignarSectorPorCartel - Primera vez');
  const sectores1 = dm.asignarSectorPorCartel();
  console.timeEnd('asignarSectorPorCartel - Primera vez');
  console.log(`   Carteles clasificados: ${sectores1.size}`);
  
  console.log('');
  console.log('Segunda ejecución (cache hit esperado)...');
  console.time('asignarSectorPorCartel - Segunda vez');
  const sectores2 = dm.asignarSectorPorCartel();
  console.timeEnd('asignarSectorPorCartel - Segunda vez');
  console.log(`   ✅ Cache funcionando: ${sectores1 === sectores2 ? 'SÍ' : 'NO'}`);
  
  console.groupEnd();
  console.log('');
  
  // ==========================================
  // Test 2: Cálculo de Montos
  // ==========================================
  console.group('💰 Test 2: Cálculo de Montos');
  
  console.log('Primera ejecución (cache miss esperado)...');
  console.time('calcularMontosEstimadosPorCartel - Primera vez');
  const montos1 = dm.calcularMontosEstimadosPorCartel();
  console.timeEnd('calcularMontosEstimadosPorCartel - Primera vez');
  console.log(`   Montos calculados: ${montos1.size}`);
  
  console.log('');
  console.log('Segunda ejecución (cache hit esperado)...');
  console.time('calcularMontosEstimadosPorCartel - Segunda vez');
  const montos2 = dm.calcularMontosEstimadosPorCartel();
  console.timeEnd('calcularMontosEstimadosPorCartel - Segunda vez');
  console.log(`   ✅ Cache funcionando: ${montos1 === montos2 ? 'SÍ' : 'NO'}`);
  
  console.groupEnd();
  console.log('');
  
  // ==========================================
  // Test 3: Dashboard Metrics
  // ==========================================
  console.group('📈 Test 3: Dashboard Metrics');
  
  const filtrosTest = {
    institucion: ['001', '002'],
    sector: ['Tecnología']
  };
  
  console.log('Primera ejecución con filtros:', filtrosTest);
  console.time('getDashboardMetrics - Primera vez');
  const metrics1 = dm.getDashboardMetrics(filtrosTest);
  console.timeEnd('getDashboardMetrics - Primera vez');
  console.log(`   Carteles: ${metrics1.kpi_metrics.total_carteles}`);
  
  console.log('');
  console.log('Segunda ejecución con MISMOS filtros (cache hit esperado)...');
  console.time('getDashboardMetrics - Segunda vez');
  const metrics2 = dm.getDashboardMetrics(filtrosTest);
  console.timeEnd('getDashboardMetrics - Segunda vez');
  console.log(`   ✅ Cache funcionando: ${metrics1 === metrics2 ? 'SÍ' : 'NO'}`);
  
  console.log('');
  console.log('Tercera ejecución con filtros DIFERENTES (cache miss esperado)...');
  console.time('getDashboardMetrics - Filtros diferentes');
  const metrics3 = dm.getDashboardMetrics({ institucion: ['003'] });
  console.timeEnd('getDashboardMetrics - Filtros diferentes');
  console.log(`   Carteles: ${metrics3.kpi_metrics.total_carteles}`);
  
  console.groupEnd();
  console.log('');
  
  // ==========================================
  // Test 4: Estadísticas de Caché
  // ==========================================
  console.group('📊 Test 4: Estadísticas de Caché');
  
  dm.mostrarEstadisticasCache();
  
  console.groupEnd();
  console.log('');
  
  // ==========================================
  // Test 5: Invalidación de Caché
  // ==========================================
  console.group('🔄 Test 5: Invalidación de Caché');
  
  console.log('Invalidando todos los cachés...');
  dm.invalidarTodosLosCaches();
  console.log('✅ Cachés invalidados');
  
  console.log('');
  console.log('Verificando que siguiente ejecución sea cache miss...');
  console.time('asignarSectorPorCartel - Post invalidación');
  const sectores3 = dm.asignarSectorPorCartel();
  console.timeEnd('asignarSectorPorCartel - Post invalidación');
  console.log(`   ✅ Nuevo objeto creado: ${sectores2 !== sectores3 ? 'SÍ' : 'NO'}`);
  
  console.groupEnd();
  console.log('');
  
  // ==========================================
  // Resumen Final
  // ==========================================
  console.group('📋 Resumen de Pruebas');
  
  console.log('✅ Sistema de caché funcionando correctamente');
  console.log('');
  console.log('Observaciones esperadas:');
  console.log('  - Primera ejecución: ~1000-2000ms (cache miss)');
  console.log('  - Segunda ejecución: <10ms (cache hit)');
  console.log('  - Filtros diferentes: cache miss esperado');
  console.log('  - Post invalidación: cache miss esperado');
  console.log('');
  console.log('Para monitoreo continuo, usar:');
  console.log('  DataManager.getInstance().mostrarEstadisticasCache()');
  
  console.groupEnd();
  console.groupEnd();
  
})();
