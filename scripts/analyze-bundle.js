/**
 * Script de Análisis de Bundle
 * Analiza el tamaño del bundle y muestra estadísticas
 * 
 * Uso: npm run build && node scripts/analyze-bundle.js
 */

const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.join(__dirname, '../build/static/js');

function analyzeBundle() {
  console.log('📦 Analizando bundle de JavaScript...\n');

  if (!fs.existsSync(BUILD_DIR)) {
    console.error('❌ Error: Directorio build no encontrado. Ejecuta "npm run build" primero.');
    process.exit(1);
  }

  const files = fs.readdirSync(BUILD_DIR)
    .filter(file => file.endsWith('.js'))
    .map(file => {
      const filePath = path.join(BUILD_DIR, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        size: stats.size,
        sizeKB: (stats.size / 1024).toFixed(2),
        type: file.includes('main') ? 'Main Bundle' : 
              file.includes('chunk') ? 'Async Chunk' : 
              'Runtime'
      };
    })
    .sort((a, b) => b.size - a.size);

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const totalKB = (totalSize / 1024).toFixed(2);

  console.log('📊 Archivos JavaScript:\n');
  console.table(files.map(f => ({
    Archivo: f.name.substring(0, 30),
    Tamaño: `${f.sizeKB} KB`,
    Tipo: f.type,
    Porcentaje: `${((f.size / totalSize) * 100).toFixed(1)}%`
  })));

  console.log(`\n📈 Total: ${totalKB} KB (${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
  
  // Recomendaciones
  console.log('\n💡 Recomendaciones:');
  
  const mainBundle = files.find(f => f.name.includes('main'));
  if (mainBundle && mainBundle.size > 400 * 1024) {
    console.log('   ⚠️  Bundle principal > 400 KB. Considera code splitting.');
  }
  
  const largeChunks = files.filter(f => f.type === 'Async Chunk' && f.size > 100 * 1024);
  if (largeChunks.length > 0) {
    console.log(`   ⚠️  ${largeChunks.length} chunks > 100 KB. Considera subdividirlos.`);
  }
  
  if (totalSize > 500 * 1024) {
    console.log('   ⚠️  Tamaño total > 500 KB. Revisa dependencias con "npm run analyze:deps".');
  }
  
  console.log('\n✅ Análisis completado!');
}

analyzeBundle();
