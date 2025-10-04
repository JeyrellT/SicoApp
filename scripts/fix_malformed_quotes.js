const fs = require('fs');
const path = require('path');

/**
 * Script para limpiar comillas malformadas en archivos CSV
 * Estos archivos tienen problemas de encoding donde caracteres especiales
 * se convirtieron en secuencias como Ã" que rompen el parsing CSV
 */

const problematicFiles = [
  'Sistemas.csv',
  'LineasContratadas.csv',
  'LineasRecibidas.csv'
];

const cleanedDir = path.join(__dirname, '../public/cleaned');

function fixMalformedQuotes(content) {
  // Reemplazar comillas que aparecen dentro de palabras (producto de encoding corrupto)
  // Ejemplo: LICITACIÃ"N → LICITACIÓN
  // Buscamos patrones donde una comilla aparece entre letras mayúsculas o acentuadas
  let fixed = content.replace(/([A-ZÀ-ÿa-z])"([A-ZÀ-ÿNna-z])/g, '$1$2');
  
  // También limpiar casos donde hay comillas sueltas al final de palabras corruptas
  // Como "ANALGÃ‰SICO" → "ANALGESICO"
  fixed = fixed.replace(/([A-ZÀ-ÿ])"/g, (match, p1) => {
    // Solo remover la comilla si no está seguida de un delimitador o fin de línea
    return p1;
  });
  
  return fixed;
}

function processFile(filename) {
  const filePath = path.join(cleanedDir, filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Archivo no encontrado: ${filename}`);
    return;
  }
  
  console.log(`\n🔧 Procesando ${filename}...`);
  
  try {
    // Leer archivo
    const content = fs.readFileSync(filePath, 'utf-8');
    const originalSize = content.length;
    
    // Contar comillas problemáticas
    const problematicQuotesCount = (content.match(/([A-ZÀ-ÿa-z])"([A-ZÀ-ÿNna-z])/g) || []).length;
    
    console.log(`   📊 Tamaño original: ${originalSize} bytes`);
    console.log(`   🔍 Comillas problemáticas encontradas: ${problematicQuotesCount}`);
    
    if (problematicQuotesCount === 0) {
      console.log(`   ✅ No se encontraron comillas malformadas`);
      return;
    }
    
    // Aplicar corrección
    const fixedContent = fixMalformedQuotes(content);
    const newSize = fixedContent.length;
    
    // Crear backup
    const backupPath = filePath + '.backup';
    if (!fs.existsSync(backupPath)) {
      fs.writeFileSync(backupPath, content, 'utf-8');
      console.log(`   💾 Backup creado: ${filename}.backup`);
    }
    
    // Guardar archivo corregido
    fs.writeFileSync(filePath, fixedContent, 'utf-8');
    
    console.log(`   ✅ Archivo corregido`);
    console.log(`   📊 Tamaño nuevo: ${newSize} bytes (diferencia: ${originalSize - newSize} bytes)`);
    console.log(`   🔧 Comillas removidas: ${problematicQuotesCount}`);
    
  } catch (error) {
    console.error(`   ❌ Error procesando ${filename}:`, error.message);
  }
}

console.log('🚀 Iniciando limpieza de comillas malformadas...');
console.log(`📁 Directorio: ${cleanedDir}`);

problematicFiles.forEach(processFile);

console.log('\n✅ Proceso completado');
