# Guía Rápida - Sistema de Gestión de Archivos CSV

## 🚀 Inicio Rápido

### 1. Cargar Archivos

```jsx
import { DataManagementHub } from './components/DataManagementHub';

function App() {
  return <DataManagementHub />;
}
```

El sistema iniciará directamente en la interfaz de carga de archivos.

### 2. Usar el Hook Principal

```jsx
import { useSicopData } from './hooks/useSicopData';

function MyComponent() {
  const { cache, consolidation } = useSicopData();
  
  // Acceder a metadatos del caché
  console.log(cache.metadata);
  
  // Consolidar datos
  const data = await consolidation.consolidate({
    years: [2024],
    types: ['Contratos']
  });
}
```

## 📁 Flujo de Trabajo Típico

### Paso 1: Cargar Archivos CSV

1. Arrastra archivos CSV a la zona de carga o haz clic para seleccionar
2. Asigna año y mes a cada archivo
3. Verifica que el tipo se detecte correctamente
4. Haz clic en "Cargar archivos"

```jsx
<FileUploader 
  onUploadComplete={(files) => {
    console.log('Archivos cargados:', files);
  }} 
/>
```

### Paso 2: Gestionar el Caché

1. Ve a la pestaña "Gestionar Caché"
2. Navega por tus archivos organizados por año/mes/tipo
3. Elimina archivos que no necesites
4. Descarga consolidados por periodo

```jsx
<CacheManager 
  onDataChange={() => {
    console.log('El caché ha cambiado');
  }} 
/>
```

### Paso 3: Consolidar y Analizar

1. Ve a la pestaña "Analizar Datos"
2. Selecciona filtros (años, meses, tipos)
3. Haz clic en "Consolidar"
4. Descarga el resultado como CSV

```jsx
<AdvancedConsolidation />
```

## 💡 Ejemplos Prácticos

### Ejemplo 1: Consolidar Contratos de un Año

```typescript
import { consolidationService } from './services/DataConsolidationService';

async function consolidateContracts2024() {
  const result = await consolidationService.consolidateData({
    years: [2024],
    types: ['Contratos'],
    deduplicateBy: 'numeroContrato'
  });
  
  console.log(`Total de contratos: ${result.metadata.totalRecords}`);
  console.log(`Archivos incluidos: ${result.metadata.filesIncluded}`);
  
  return result.data;
}
```

### Ejemplo 2: Comparar Dos Periodos

```typescript
async function comparePeriods() {
  const comparison = await consolidationService.comparePeriods(
    2023, 1,  // Enero 2023
    2024, 1,  // Enero 2024
    'Contratos',
    'montoTotal'
  );
  
  console.log(`Diferencia: ${comparison.difference}`);
  console.log(`Cambio porcentual: ${comparison.percentageChange}%`);
}
```

### Ejemplo 3: Exportar Datos Consolidados

```typescript
async function exportAllProviders() {
  await consolidationService.downloadConsolidatedCSV(
    'proveedores_2024_completo.csv',
    {
      years: [2024],
      types: ['Proveedores_unido'],
      sortBy: 'nombre',
      sortOrder: 'asc'
    }
  );
}
```

### Ejemplo 4: Obtener Estadísticas

```typescript
import { cacheService } from './services/CacheService';

async function getCacheStatistics() {
  const stats = await cacheService.getCacheStats();
  
  console.log('Archivos totales:', stats.totalFiles);
  console.log('Registros totales:', stats.totalRecords);
  console.log('Tamaño del caché:', stats.totalSize, 'bytes');
  console.log('Años disponibles:', stats.yearsList);
  console.log('Tipos de archivo:', stats.fileTypes);
}
```

### Ejemplo 5: Consolidar Múltiples Tipos

```typescript
async function consolidateMultipleTypes() {
  const result = await consolidationService.consolidateData({
    years: [2023, 2024],
    types: ['Contratos', 'LineasContratadas', 'Ofertas'],
    months: [1, 2, 3] // Primer trimestre
  });
  
  // Agrupar por tipo
  const grouped = result.data.reduce((acc, item) => {
    const type = item._fileType || 'Desconocido';
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {});
  
  return grouped;
}
```

## 🎯 Casos de Uso Comunes

### Análisis Anual Completo

```typescript
async function annualAnalysis(year: number) {
  const stats = await consolidationService.getConsolidatedStats({
    years: [year]
  });
  
  return {
    year,
    totalRecords: stats.totalRecords,
    filesProcessed: stats.filesIncluded,
    dataTypes: stats.types,
    sizeInMB: stats.sizeInMB
  };
}
```

### Consolidación por Trimestre

```typescript
async function quarterlyConsolidation(year: number, quarter: 1 | 2 | 3 | 4) {
  const monthRanges = {
    1: [1, 2, 3],
    2: [4, 5, 6],
    3: [7, 8, 9],
    4: [10, 11, 12]
  };
  
  return await consolidationService.consolidateData({
    years: [year],
    months: monthRanges[quarter],
    types: ['Contratos', 'Proveedores_unido']
  });
}
```

### Limpiar Archivos Antiguos

```typescript
async function cleanOldData(beforeYear: number) {
  const metadata = await cacheService.getMetadata();
  
  const oldFiles = metadata.files.filter(f => f.year < beforeYear);
  
  for (const file of oldFiles) {
    await cacheService.deleteFile(file.id);
  }
  
  console.log(`Eliminados ${oldFiles.length} archivos anteriores a ${beforeYear}`);
}
```

## 🛠️ Personalización

### Crear un Componente Personalizado

```jsx
import { useSicopData } from './hooks/useSicopData';
import { useState, useEffect } from 'react';

function CustomDataViewer() {
  const { cache, consolidation } = useSicopData();
  const [data, setData] = useState([]);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    const result = await consolidation.consolidateByYear(2024);
    setData(result.data);
  };
  
  return (
    <div>
      <h2>Total de registros: {data.length}</h2>
      <table>
        {/* Renderizar datos */}
      </table>
    </div>
  );
}
```

### Agregar Validación Personalizada

```typescript
async function validateAndSaveFile(file: File, year: number, month: number) {
  // Validar tamaño
  if (file.size > 100 * 1024 * 1024) { // 100MB
    throw new Error('Archivo demasiado grande');
  }
  
  // Validar extensión
  if (!file.name.endsWith('.csv')) {
    throw new Error('Solo se permiten archivos CSV');
  }
  
  // Parsear y validar contenido
  const Papa = await import('papaparse');
  const result = await new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      complete: resolve,
      error: reject
    });
  });
  
  // Guardar en caché
  return await cacheService.saveFile(
    file.name,
    result.data,
    year,
    month,
    detectFileType(file.name)
  );
}
```

## 📊 Visualización de Datos

### Integrar con Chart.js

```jsx
import { useSicopData } from './hooks/useSicopData';
import { Line } from 'react-chartjs-2';

function MonthlyTrendChart() {
  const { consolidation } = useSicopData();
  const [chartData, setChartData] = useState(null);
  
  useEffect(() => {
    loadChartData();
  }, []);
  
  const loadChartData = async () => {
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const data = [];
    
    for (const month of months) {
      const result = await consolidation.consolidateByMonth(2024, month, {
        types: ['Contratos']
      });
      data.push(result.metadata.totalRecords);
    }
    
    setChartData({
      labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
               'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
      datasets: [{
        label: 'Contratos por mes',
        data,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }]
    });
  };
  
  return chartData ? <Line data={chartData} /> : <div>Cargando...</div>;
}
```

## ⚡ Optimización de Rendimiento

### Usar Paginación para Grandes Conjuntos

```typescript
async function getPaginatedData(page: number, pageSize: number = 100) {
  const result = await consolidationService.consolidateData({
    years: [2024],
    types: ['Contratos']
  });
  
  const start = page * pageSize;
  const end = start + pageSize;
  
  return {
    data: result.data.slice(start, end),
    total: result.data.length,
    page,
    pageSize,
    totalPages: Math.ceil(result.data.length / pageSize)
  };
}
```

### Cachear Resultados de Consolidación

```typescript
const consolidationCache = new Map();

async function getCachedConsolidation(key: string, options: any) {
  if (consolidationCache.has(key)) {
    return consolidationCache.get(key);
  }
  
  const result = await consolidationService.consolidateData(options);
  consolidationCache.set(key, result);
  
  return result;
}

// Uso
const data = await getCachedConsolidation('contratos_2024', {
  years: [2024],
  types: ['Contratos']
});
```

## 🔍 Debugging y Troubleshooting

### Verificar Estado del Caché

```typescript
async function debugCache() {
  const metadata = await cacheService.getMetadata();
  const stats = await cacheService.getCacheStats();
  
  console.log('=== DEBUG CACHE ===');
  console.log('Total de archivos:', metadata.files.length);
  console.log('Última actualización:', metadata.lastUpdated);
  console.log('Tamaño total:', stats.totalSize);
  console.log('Años disponibles:', stats.yearsList);
  console.log('Archivos por tipo:', 
    metadata.files.reduce((acc, f) => {
      acc[f.type] = (acc[f.type] || 0) + 1;
      return acc;
    }, {})
  );
}
```

### Validar Integridad de Datos

```typescript
async function validateDataIntegrity() {
  const metadata = await cacheService.getMetadata();
  const issues = [];
  
  for (const fileInfo of metadata.files) {
    const fileData = await cacheService.getFile(fileInfo.id);
    
    if (!fileData) {
      issues.push(`Archivo no encontrado: ${fileInfo.id}`);
      continue;
    }
    
    if (fileData.data.length !== fileInfo.recordCount) {
      issues.push(`Conteo de registros no coincide: ${fileInfo.fileName}`);
    }
  }
  
  return issues;
}
```

## 📝 Notas Importantes

1. **Límites del navegador**: IndexedDB tiene límites de almacenamiento que varían por navegador
2. **Rendimiento**: Consolidar muchos archivos grandes puede ser lento
3. **Persistencia**: Los datos solo se almacenan en el navegador actual
4. **Backup**: Exporta datos importantes regularmente como CSV
5. **Validación**: Verifica siempre la calidad de los datos antes de consolidar

## 🎓 Recursos Adicionales

- Consulta `FILE_UPLOAD_SYSTEM.md` para documentación completa
- Revisa los componentes de ejemplo en `src/components/`
- Explora los servicios en `src/services/`
- Usa los hooks en `src/hooks/useSicopData.ts`
