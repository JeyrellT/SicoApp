// Script para depurar categorías manuales en localStorage
// Ejecutar en la consola del navegador

console.log('=== DEBUG CATEGORÍAS MANUALES ===\n');

// 1. Verificar localStorage
const rulesJson = localStorage.getItem('sicop.manualCategories.v1');
const configJson = localStorage.getItem('sicop.categoryConfiguration.v1');

console.log('📦 localStorage:');
console.log('  - sicop.manualCategories.v1:', rulesJson ? 'EXISTS' : 'NOT FOUND');
console.log('  - sicop.categoryConfiguration.v1:', configJson ? 'EXISTS' : 'NOT FOUND');

if (rulesJson) {
  try {
    const rules = JSON.parse(rulesJson);
    console.log('\n📋 Categorías Manuales:');
    console.log('  Total:', Array.isArray(rules) ? rules.length : 'NO ES ARRAY');
    
    if (Array.isArray(rules)) {
      const activas = rules.filter(r => r.activo !== false);
      const inactivas = rules.filter(r => r.activo === false);
      
      console.log('  Activas:', activas.length);
      console.log('  Inactivas:', inactivas.length);
      
      console.log('\n📝 Detalles:');
      rules.forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.nombre} (${r.activo !== false ? 'ACTIVA' : 'INACTIVA'})`);
        console.log(`     ID: ${r.id}`);
        console.log(`     Keywords: ${r.palabrasClave?.length || 0}`);
        console.log(`     Ejemplos: ${r.descripcionEjemplos?.length || 0}`);
      });
    } else {
      console.log('  ⚠️ ERROR: rules no es un array:', typeof rules);
    }
  } catch (error) {
    console.error('  ❌ Error parseando JSON:', error);
  }
}

if (configJson) {
  try {
    const config = JSON.parse(configJson);
    console.log('\n⚙️ Configuración de Categorías:');
    console.log('  Timestamp:', config.timestamp ? new Date(config.timestamp).toLocaleString() : 'N/A');
    console.log('  Total en config:', Object.keys(config.categorias || {}).length);
    
    if (config.categorias) {
      console.log('\n  Estado por categoría:');
      Object.entries(config.categorias).forEach(([cat, estado]) => {
        console.log(`    - ${cat}: ${estado === false ? 'DESACTIVADA' : 'ACTIVA'}`);
      });
    }
  } catch (error) {
    console.error('  ❌ Error parseando config:', error);
  }
}

// 2. Verificar si hay datos cargados
console.log('\n🔍 Verificando DataManager:');
if (typeof dataManager !== 'undefined') {
  console.log('  DataManager disponible: SÍ');
  
  try {
    const rules = dataManager.getSectorRules();
    const ruleNames = Object.keys(rules);
    console.log('  Total de reglas combinadas:', ruleNames.length);
    console.log('  Categorías:', ruleNames.join(', '));
  } catch (error) {
    console.error('  ❌ Error obteniendo rules:', error);
  }
} else {
  console.log('  DataManager disponible: NO');
}

console.log('\n=== FIN DEBUG ===');
