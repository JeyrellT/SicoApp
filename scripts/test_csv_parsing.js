const Papa = require('papaparse');
const fs = require('fs');
const path = require('path');

/**
 * Script de prueba para verificar el parsing de archivos CSV problemáticos
 */

const problematicFiles = [
  'Sistemas.csv',
  'LineasContratadas.csv', 
  'LineasRecibidas.csv'
];

const cleanedDir = path.join(__dirname, '../public/cleaned');

function testParseFile(filename) {
  const filePath = path.join(cleanedDir, filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Archivo no encontrado: ${filename}`);
    return;
  }
  
  console.log(`\n🧪 Probando parsing de ${filename}...`);
  
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Probar con diferentes delimitadores
  const delimiters = [';', ','];
  
  delimiters.forEach(delimiter => {
    console.log(`\n  📊 Intentando con delimitador "${delimiter}":`);
    
    Papa.parse(content, {
      header: true,
      delimiter: delimiter,
      skipEmptyLines: true,
      quoteChar: '"',
      escapeChar: '"',
      complete: (results) => {
        const errors = results.errors || [];
        const fatalErrors = errors.filter(e => e.type !== 'FieldMismatch' && e.type !== 'Quotes');
        const warnings = errors.filter(e => e.type === 'FieldMismatch' || e.type === 'Quotes');
        
        console.log(`     ✅ Registros parseados: ${results.data.length}`);
        console.log(`     ⚠️  Advertencias (FieldMismatch/Quotes): ${warnings.length}`);
        console.log(`     ❌ Errores fatales: ${fatalErrors.length}`);
        
        if (fatalErrors.length > 0) {
          console.log(`     🔍 Primer error fatal:`, fatalErrors[0]);
        } else if (warnings.length > 0) {
          console.log(`     🔍 Primeras 3 advertencias:`, warnings.slice(0, 3));
        }
        
        if (results.data.length > 0) {
          const firstRow = results.data[0];
          const fieldCount = Object.keys(firstRow).length;
          console.log(`     📋 Campos detectados: ${fieldCount}`);
          console.log(`     📝 Nombres de campos:`, Object.keys(firstRow).slice(0, 10).join(', '));
        }
      },
      error: (error) => {
        console.log(`     ❌ Error de parsing:`, error.message);
      }
    });
  });
}

console.log('🚀 Iniciando pruebas de parsing CSV...');
console.log(`📁 Directorio: ${cleanedDir}`);

problematicFiles.forEach(testParseFile);

console.log('\n✅ Pruebas completadas');
