const testNormalization = (header) => {
  // Simular la función normalizarNombreColumna ACTUALIZADA
  let procesado = header.trim();
  
  // Normalizar acentos
  const normalizarAcentos = (str) => {
    return str
      .replace(/[áàäâ]/gi, 'a')
      .replace(/[éèëê]/gi, 'e')
      .replace(/[íìïî]/gi, 'i')
      .replace(/[óòöô]/gi, 'o')
      .replace(/[úùüû]/gi, 'u')
      .replace(/[ñ]/gi, 'n')
      .replace(/[ç]/gi, 'c');
  };
  
  procesado = normalizarAcentos(procesado);
  
  let normalizado = procesado
    .replace(/["']/g, '') // Remover comillas
    .replace(/[^\w\s]/g, '_') // Reemplazar caracteres especiales con _
    .replace(/\s+/g, '_') // Reemplazar espacios con _
    .replace(/_+/g, '_') // Consolidar múltiples _ en uno solo
    .toLowerCase();

  const mapeos = {
    'nombre': 'nombreProveedor',
    'nombre_proveedor': 'nombreProveedor',
    'nombreproveedor': 'nombreProveedor',
    'cedula_proveedor': 'idProveedor',
    'cedula_institucion': 'codigoInstitucion',
  };

  const result = mapeos[normalizado] || normalizado;
  return { original: header, procesado, normalizado, result };
};

// Test con headers reales de Proveedores_unido.csv
const headers = [
  'Cédula Proveedor',
  'Nombre Proveedor',
  'Tipo Proveedor',
  'Tamaño Proveedor'
];

console.log('🔍 NORMALIZACIÓN DE HEADERS - Proveedores_unido.csv (FIXED)');
console.log('='.repeat(80));
headers.forEach(h => {
  const norm = testNormalization(h);
  console.log(`Original: "${norm.original}"`);
  console.log(`  → Procesado: "${norm.procesado}"`);
  console.log(`  → Normalizado: "${norm.normalizado}"`);
  console.log(`  → Resultado final: "${norm.result}" ${norm.result === 'idProveedor' || norm.result === 'nombreProveedor' ? '✅' : ''}`);
  console.log('');
});

// Test con headers de LineasContratadas
console.log('🔍 NORMALIZACIÓN DE HEADERS - LineasContratadas.csv (FIXED)');
console.log('='.repeat(80));
const lineasHeaders = ['CEDULA_PROVEEDOR', 'NRO_CONTRATO'];
lineasHeaders.forEach(h => {
  const norm = testNormalization(h);
  console.log(`Original: "${norm.original}"`);
  console.log(`  → Normalizado: "${norm.normalizado}"`);
  console.log(`  → Resultado final: "${norm.result}" ${norm.result === 'idProveedor' ? '✅' : ''}`);
  console.log('');
});
