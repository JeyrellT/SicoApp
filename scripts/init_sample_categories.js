// Script para inicializar categorías de ejemplo en localStorage
// Ejecutar en la consola del navegador si no hay categorías

const sampleCategories = [
  {
    id: 'cat_papeleria_oficina',
    nombre: 'Suministros de Oficina y Papelería',
    palabrasClave: [
      'papel',
      'lapicero',
      'folder',
      'archivador',
      'engrapadora',
      'clips',
      'post-it',
      'marcador',
      'resaltador',
      'tinta',
      'toner',
      'cartucho'
    ],
    descripcionEjemplos: [
      'Papel bond carta 20 lbs',
      'Lapiceros azules caja x 12',
      'Folders de manila tamaño oficio'
    ],
    activo: true,
    fechaCreacion: new Date().toISOString(),
    categoria: 'manual',
    colorHex: '#f39c12'
  },
  {
    id: 'cat_tecnologia',
    nombre: 'Tecnología y Sistemas',
    palabrasClave: [
      'computadora',
      'laptop',
      'servidor',
      'router',
      'switch',
      'software',
      'licencia',
      'antivirus',
      'monitor',
      'teclado',
      'mouse',
      'impresora',
      'escáner'
    ],
    descripcionEjemplos: [
      'Laptops Dell Core i5 8GB RAM',
      'Licencias Microsoft Office 365',
      'Router empresarial Cisco'
    ],
    activo: true,
    fechaCreacion: new Date().toISOString(),
    categoria: 'manual',
    colorHex: '#9b59b6'
  },
  {
    id: 'cat_limpieza',
    nombre: 'Limpieza y Mantenimiento',
    palabrasClave: [
      'limpieza',
      'desinfectante',
      'detergente',
      'escoba',
      'trapeador',
      'jabón',
      'cloro',
      'bolsa de basura',
      'papel higiénico',
      'toalla',
      'guantes',
      'conserje'
    ],
    descripcionEjemplos: [
      'Servicio de limpieza institucional',
      'Productos de limpieza y desinfección',
      'Bolsas de basura negras 80 litros'
    ],
    activo: true,
    fechaCreacion: new Date().toISOString(),
    categoria: 'manual',
    colorHex: '#16a085'
  },
  {
    id: 'cat_salud',
    nombre: 'Salud y Medicina',
    palabrasClave: [
      'medicamento',
      'medicina',
      'suero',
      'jeringa',
      'guante médico',
      'mascarilla quirúrgica',
      'alcohol',
      'gasa',
      'vendaje',
      'equipo médico',
      'laboratorio',
      'reactivo'
    ],
    descripcionEjemplos: [
      'Medicamentos para farmacia institucional',
      'Equipo de protección médica',
      'Jeringas desechables estériles'
    ],
    activo: true,
    fechaCreacion: new Date().toISOString(),
    categoria: 'manual',
    colorHex: '#e74c3c'
  },
  {
    id: 'cat_construccion',
    nombre: 'Construcción y Materiales',
    palabrasClave: [
      'cemento',
      'arena',
      'piedra',
      'block',
      'ladrillo',
      'pintura',
      'brocha',
      'rodillo',
      'tubo pvc',
      'cable eléctrico',
      'interruptor',
      'lámpara',
      'construcción',
      'remodelación'
    ],
    descripcionEjemplos: [
      'Materiales de construcción para remodelación',
      'Pintura látex para edificio institucional',
      'Tubería PVC sanitaria'
    ],
    activo: true,
    fechaCreacion: new Date().toISOString(),
    categoria: 'manual',
    colorHex: '#d35400'
  }
];

console.log('🔧 Inicializando categorías de ejemplo...\n');

// Guardar en localStorage
localStorage.setItem('sicop.manualCategories.v1', JSON.stringify(sampleCategories));

console.log(`✅ ${sampleCategories.length} categorías guardadas en localStorage\n`);

// Crear configuración inicial (todas activas)
const config = {
  timestamp: new Date().toISOString(),
  categorias: {}
};

sampleCategories.forEach(cat => {
  config.categorias[cat.id] = true;
});

localStorage.setItem('sicop.categoryConfiguration.v1', JSON.stringify(config));

console.log('✅ Configuración inicial creada\n');

// Mostrar resumen
console.log('📋 Categorías creadas:');
sampleCategories.forEach((cat, i) => {
  console.log(`  ${i + 1}. ${cat.nombre} (${cat.palabrasClave.length} keywords)`);
});

console.log('\n🔄 Recarga la página para ver los cambios');
