# Sistema de Carga y Gestión de Archivos CSV

## Descripción General

Este sistema permite a los usuarios cargar, organizar y consolidar archivos CSV del sistema SICOP, organizándolos por año y mes. Los datos se almacenan en caché usando IndexedDB para permitir el análisis de múltiples periodos.

## Características Principales

### 1. Carga de Archivos
- **Drag & Drop**: Arrastra archivos CSV directamente a la interfaz
- **Selección Múltiple**: Carga varios archivos simultáneamente
- **Validación Automática**: Detecta automáticamente el tipo de archivo
- **Organización Temporal**: Asigna año y mes a cada archivo

### 2. Gestión de Caché
- **Almacenamiento en IndexedDB**: Datos persistentes en el navegador
- **Organización Jerárquica**: Archivos organizados por Año → Mes → Tipo
- **Visualización Interactiva**: Navega fácilmente por tus datos
- **Estadísticas en Tiempo Real**: Ve métricas de uso del caché

### 3. Consolidación de Datos
- **Múltiples Periodos**: Combina datos de varios meses/años
- **Filtrado Avanzado**: Filtra por año, mes o tipo de archivo
- **Deduplicación**: Elimina registros duplicados automáticamente
- **Exportación CSV**: Descarga datos consolidados

## Componentes Principales

### DataManagementHub
Componente principal que integra toda la funcionalidad:
- **Tab "Cargar Archivos"**: Interfaz de carga
- **Tab "Gestionar Caché"**: Visualización y administración
- **Tab "Analizar Datos"**: Información y guías de uso

### FileUploader
Componente de carga de archivos con:
- Zona de drag & drop
- Detección automática de tipo de archivo
- Selección de año y mes
- Seguimiento de estado de carga
- Validación de archivos CSV

### CacheManager
Gestor visual del caché con:
- Vista jerárquica por año/mes/tipo
- Eliminación selectiva de archivos
- Descarga de datos consolidados
- Estadísticas de uso

## Servicios

### CacheService
Maneja el almacenamiento en IndexedDB:

```typescript
// Guardar archivo
await cacheService.saveFile(fileName, data, year, month, type);

// Obtener archivos filtrados
const files = await cacheService.getFilteredFiles(year, month, type);

// Eliminar archivo
await cacheService.deleteFile(fileId);

// Obtener estadísticas
const stats = await cacheService.getCacheStats();
```

### DataConsolidationService
Consolida datos de múltiples archivos:

```typescript
// Consolidar todos los datos
const result = await consolidationService.consolidateData({
  years: [2023, 2024],
  months: [1, 2, 3],
  types: ['Contratos', 'Proveedores'],
  deduplicateBy: 'id',
});

// Consolidar por año
const yearData = await consolidationService.consolidateByYear(2024);

// Descargar CSV consolidado
await consolidationService.downloadConsolidatedCSV('reporte.csv', options);
```

## Hooks Personalizados

### useSicopData
Hook que combina todas las funcionalidades:

```typescript
const { cache, consolidation } = useSicopData();

// Usar funciones de caché
await cache.saveFile(fileName, data, year, month, type);
const stats = await cache.getStats();

// Usar funciones de consolidación
const result = await consolidation.consolidate(options);
await consolidation.downloadCSV('reporte.csv', options);
```

### useFileCache
Hook específico para operaciones de caché:

```typescript
const { 
  metadata, 
  loading, 
  error, 
  saveFile, 
  deleteFile, 
  clearCache 
} = useFileCache();
```

### useDataConsolidation
Hook específico para consolidación:

```typescript
const { 
  consolidate, 
  consolidateByYear, 
  downloadCSV, 
  loading 
} = useDataConsolidation();
```

## Tipos de Archivos Soportados

El sistema reconoce automáticamente estos tipos de archivos CSV:

- AdjudicacionesFirme
- Contratos
- DetalleCarteles
- DetalleLineaCartel
- FechaPorEtapas
- FuncionariosInhibicion
- Garantias
- InstitucionesRegistradas
- InvitacionProcedimiento
- LineasAdjudicadas
- LineasContratadas
- LineasOfertadas
- LineasRecibidas
- Ofertas
- OrdenPedido
- ProcedimientoAdjudicacion
- ProcedimientoADM
- Proveedores_unido
- ReajustePrecios
- Recepciones
- RecursosObjecion
- Remates
- SancionProveedores
- SistemaEvaluacionOfertas
- Sistemas

## Uso Básico

### 1. Cargar Archivos

```jsx
import { FileUploader } from './components/FileUploader';

function MyComponent() {
  const handleUploadComplete = (files) => {
    console.log('Archivos cargados:', files);
  };

  return <FileUploader onUploadComplete={handleUploadComplete} />;
}
```

### 2. Gestionar Caché

```jsx
import { CacheManager } from './components/CacheManager';

function MyComponent() {
  const handleDataChange = () => {
    console.log('Datos actualizados');
  };

  return <CacheManager onDataChange={handleDataChange} />;
}
```

### 3. Sistema Completo

```jsx
import { DataManagementHub } from './components/DataManagementHub';

function App() {
  const handleDataReady = () => {
    console.log('Datos listos para análisis');
  };

  return <DataManagementHub onDataReady={handleDataReady} />;
}
```

## Ejemplos de Consolidación

### Consolidar datos de un año completo
```typescript
const result = await consolidationService.consolidateByYear(2024);
console.log(`Total de registros: ${result.metadata.totalRecords}`);
```

### Consolidar múltiples tipos de archivos
```typescript
const result = await consolidationService.consolidateData({
  types: ['Contratos', 'Proveedores'],
  deduplicateBy: 'id',
});
```

### Comparar dos periodos
```typescript
const comparison = await consolidationService.comparePeriods(
  2023, 1,  // Enero 2023
  2024, 1,  // Enero 2024
  'Contratos',
  'monto'
);

console.log(`Cambio: ${comparison.percentageChange}%`);
```

### Exportar datos consolidados
```typescript
await consolidationService.downloadConsolidatedCSV('reporte_2024.csv', {
  years: [2024],
  types: ['Contratos'],
});
```

## Estructura de Datos

### CachedFile
```typescript
interface CachedFile {
  id: string;              // Identificador único
  fileName: string;        // Nombre del archivo
  year: number;           // Año asignado
  month: number;          // Mes asignado (1-12)
  uploadDate: string;     // Fecha de carga (ISO)
  size: number;           // Tamaño en bytes
  recordCount: number;    // Número de registros
  type: string;           // Tipo de archivo
}
```

### ConsolidatedResult
```typescript
interface ConsolidatedResult {
  data: any[];           // Datos consolidados
  metadata: {
    totalRecords: number;
    filesIncluded: number;
    yearRange: { min: number; max: number };
    monthRange: { min: number; max: number };
    types: string[];
    consolidatedAt: string;
  };
}
```

## Limitaciones y Consideraciones

1. **Tamaño del Caché**: IndexedDB tiene límites según el navegador
2. **Memoria del Navegador**: Archivos muy grandes pueden afectar el rendimiento
3. **Persistencia**: Los datos se almacenan localmente en el navegador
4. **Compatibilidad**: Requiere navegadores modernos con soporte para IndexedDB

## Mejores Prácticas

1. **Organización**: Mantén archivos organizados por periodo cronológico
2. **Limpieza**: Elimina archivos antiguos que no necesites
3. **Consolidación**: Usa filtros específicos para mejorar el rendimiento
4. **Respaldo**: Descarga datos consolidados importantes como CSV
5. **Validación**: Verifica que los archivos CSV tengan el formato correcto

## Integración con la Aplicación

El sistema se integra automáticamente al iniciar la aplicación:

```jsx
// src/App.js
import { DataManagementHub } from './components/DataManagementHub';

function App() {
  return <DataManagementHub onDataReady={handleDataReady} />;
}
```

El flujo es:
1. Usuario carga archivos CSV
2. Archivos se organizan por año/mes
3. Datos se almacenan en caché
4. Usuario puede consolidar y analizar
5. Datos se pasan a la aplicación principal

## Soporte y Contribuciones

Para reportar problemas o sugerir mejoras, contacta al equipo de desarrollo.
