const fs = require('fs');
const path = require('path');

// Read CSV file
const csvPath = path.join(__dirname, '../public/cleaned/Proveedores_unido.csv');
const content = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV
const lines = content.split('\n').filter(l => l.trim());
const header = lines[0];
const rows = lines.slice(1);

console.log('📊 ANÁLISIS DE PROVEEDORES');
console.log('='.repeat(80));
console.log(`Total de proveedores: ${rows.length}`);
console.log('');

// Parse header
const headerParts = header.split(';').map(h => h.replace(/"/g, '').trim());
console.log('Columnas del CSV:');
headerParts.forEach((col, idx) => {
  console.log(`  [${idx}] ${col}`);
});
console.log('');

// Parse first few rows
console.log('Primeros 5 registros:');
for (let i = 0; i < Math.min(5, rows.length); i++) {
  const parts = rows[i].split(';').map(p => p.replace(/"/g, '').trim());
  const proveedor = {
    cedula: parts[0],
    nombre: parts[1],
    tipo: parts[2],
    tamano: parts[3]
  };
  console.log(`  [${i+1}] ${proveedor.cedula} => "${proveedor.nombre}"`);
}
console.log('');

// Check for empty names
let emptyNames = 0;
let validNames = 0;
rows.forEach(row => {
  const parts = row.split(';').map(p => p.replace(/"/g, '').trim());
  if (!parts[1] || parts[1] === '') {
    emptyNames++;
  } else {
    validNames++;
  }
});

console.log('Estadísticas de nombres:');
console.log(`  ✅ Con nombre válido: ${validNames} (${((validNames/rows.length)*100).toFixed(2)}%)`);
console.log(`  ❌ Sin nombre: ${emptyNames} (${((emptyNames/rows.length)*100).toFixed(2)}%)`);
console.log('');

// Check LineasContratadas for provider IDs
console.log('Verificando LineasContratadas...');
const lineasPath = path.join(__dirname, '../public/cleaned/LineasContratadas.csv');
const lineasContent = fs.readFileSync(lineasPath, 'utf-8');
const lineasLines = lineasContent.split('\n').filter(l => l.trim());
const lineasHeader = lineasLines[0];
const lineasHeaderParts = lineasHeader.split(';').map(h => h.replace(/"/g, '').trim());

console.log('Columnas de LineasContratadas:');
lineasHeaderParts.forEach((col, idx) => {
  if (col.toLowerCase().includes('proveedor') || col.toLowerCase().includes('cedula')) {
    console.log(`  [${idx}] ${col} ⭐`);
  }
});
console.log('');

// Sample lineas
console.log('Primeros 3 registros de LineasContratadas:');
for (let i = 1; i <= Math.min(3, lineasLines.length - 1); i++) {
  const parts = lineasLines[i].split(';').map(p => p.replace(/"/g, '').trim());
  // Find provider ID column
  let providerId = '';
  lineasHeaderParts.forEach((col, idx) => {
    if (col.toLowerCase().includes('proveedor') && col.toLowerCase().includes('id')) {
      providerId = parts[idx];
    }
  });
  console.log(`  [${i}] Provider ID: ${providerId}`);
}
