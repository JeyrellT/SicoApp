# Arquitectura de Gestión de Datos SICOP

## 📋 Resumen Ejecutivo

Este documento describe la arquitectura completa del sistema de gestión de datos de SICOP, desde la carga de archivos CSV hasta su uso en la aplicación principal.

---

## 🏗️ Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                      USUARIO                                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WelcomeScreen                                 │
│  • Opción 1: Gestionar Datos                                    │
│  • Opción 2: Ir a Aplicación (requiere datos en caché)         │
└───────────┬────────────────────────────┬────────────────────────┘
            │                            │
            ▼                            ▼
┌───────────────────────┐    ┌──────────────────────────┐
│ DataManagementHub     │    │ MainApp (SICOP)          │
│ • Cargar archivos     │    │ • Dashboard              │
│ • Validar datos       │    │ • Análisis               │
│ • Gestionar caché     │    │ • Reportes               │
│ • Limpiar datos       │    │ • Buscar proveedores     │
└───────┬───────────────┘    └────────▲─────────────────┘
        │                             │
        ▼                             │
┌───────────────────────────────────┐ │
│ FileUploader                      │ │
│ 1. Selecciona año/mes global      │ │
│ 2. Arrastra/selecciona CSVs       │ │
│ 3. Parsea con PapaParse (sep: ;) │ │
│ 4. Normaliza headers              │ │
│ 5. Guarda en IndexedDB            │ │
└───────┬───────────────────────────┘ │
        │                             │
        ▼                             │
┌───────────────────────────────────┐ │
│ HeaderNormalizationService        │ │
│ • Mapea headers CSV → DataManager │ │
│ • NRO_SICOP → numeroCartel        │ │
│ • CEDULA_PROVEEDOR → idProveedor  │ │
└───────┬───────────────────────────┘ │
        │                             │
        ▼                             │
┌───────────────────────────────────┐ │
│ CacheService (IndexedDB)          │ │
│ • Almacena datos normalizados     │ │
│ • Organiza por año/mes/tipo       │ │
│ • Permite eliminar datos          │ │
└───────┬───────────────────────────┘ │
        │                             │
        ▼                             │
┌───────────────────────────────────┐ │
│ DataLoaderService                 │ │
│ • Lee caché                       │ │
│ • Consolida por tipo              │ │
│ • Deduplica registros             │ │
└───────┬───────────────────────────┘ │
        │                             │
        └─────────────────────────────┘
                │
                ▼
┌───────────────────────────────────┐
│ DataManager                       │
│ • Indexa datos                    │
│ • Crea relaciones                 │
│ • Provee API de consulta          │
└───────────────────────────────────┘
```

---

## 📂 Estructura Real de los CSV

### Formato de Archivos
- **Delimitador**: Punto y coma (`;`)
- **Encoding**: UTF-8 (con acentos)
- **Headers**: MAYÚSCULAS con guiones bajos

### Ejemplos de Headers Reales

#### Proveedores_unido.csv
```csv
Cédula Proveedor;Nombre Proveedor;Tipo Proveedor;Tamaño Proveedor;Codigo Postal;Provincia;Canton;Distrito
```

#### LineasAdjudicadas.csv
```csv
NRO_SICOP,NRO_OFERTA,CODIGO_PRODUCTO,NRO_LINEA,NRO_ACTO,CEDULA_PROVEEDOR,CANTIDAD_ADJUDICADA,PRECIO_UNITARIO_ADJUDICADO,TIPO_MONEDA
```

#### ProcedimientoAdjudicacion.csv
```csv
CEDULA,INSTITUCION,ANO,NUMERO_PROCEDIMIENTO,CEDULA_PROVEEDOR,NOMBRE_PROVEEDOR,NRO_SICOP,TIPO_PROCEDIMIENTO
```

#### InstitucionesRegistradas.csv
```csv
CEDULA,NOMBRE_INSTITUCION,ZONA_GEO_INST,FECHA_INGRESO,FECHA_MOD
```

#### DetalleLineaCartel.csv
```csv
NRO_SICOP,NUMERO_LINEA,CANTIDAD_SOLICITADA,PRECIO_UNITARIO_ESTIMADO,DESC_LINEA
```

---

## 🔄 Proceso de Normalización

### 1. Headers CSV Reales → Headers Normalizados

El `HeaderNormalizationService` convierte automáticamente:

| CSV Real | DataManager Esperado | Archivo |
|----------|---------------------|---------|
| `NRO_SICOP` | `numeroCartel` | Todos |
| `CEDULA_PROVEEDOR` | `idProveedor` | Proveedores |
| `CEDULA` | `codigoInstitucion` | Instituciones |
| `NUMERO_LINEA` | `numeroLinea` | DetalleLineaCartel |
| `DESC_LINEA` | `descripcionLinea` | DetalleLineaCartel |
| `CANTIDAD_ADJUDICADA` | `cantidadAdjudicada` | LineasAdjudicadas |
| `PRECIO_UNITARIO_ADJUDICADO` | `precioUnitarioAdjudicado` | LineasAdjudicadas |

### 2. Flujo de Normalización

```typescript
// 1. Usuario sube archivo
const file = "LineasAdjudicadas.csv"

// 2. PapaParse lee con delimitador ;
const rawData = Papa.parse(file, { delimiter: ';' })
// Resultado: [{ NRO_SICOP: "123", CEDULA_PROVEEDOR: "456" }, ...]

// 3. HeaderNormalizationService normaliza
const normalizedData = headerNormalizationService.normalizeRecords(
  rawData, 
  'LineasAdjudicadas'
)
// Resultado: [{ numeroCartel: "123", idProveedor: "456" }, ...]

// 4. Se guarda en IndexedDB
await cacheService.saveFile(fileName, normalizedData, year, month, type)

// 5. DataManager lo recibe ya normalizado
await dataManager.loadDataFromMemory(consolidatedData)
```

---

## 🗂️ Mapeo Completo de Archivos

### Archivos Soportados (25 tipos)

1. **InstitucionesRegistradas** - Catálogo de instituciones
2. **Proveedores / Proveedores_unido** - Catálogo de proveedores
3. **ProcedimientoAdjudicacion** - Datos de procedimientos
4. **ProcedimientoADM** - Procedimientos administrativos
5. **DetalleCarteles** - Información de carteles
6. **DetalleLineaCartel** - Líneas de cada cartel
7. **FechaPorEtapas** - Fechas clave del proceso
8. **Ofertas** - Ofertas presentadas
9. **LineasOfertadas** - Detalle de líneas ofertadas
10. **LineasRecibidas** - Líneas recibidas
11. **LineasAdjudicadas** - Líneas adjudicadas
12. **AdjudicacionesFirme** - Adjudicaciones firmes
13. **Contratos** - Contratos firmados
14. **LineasContratadas** - Líneas de contratos
15. **OrdenPedido** - Órdenes de pedido
16. **Recepciones** - Recepciones de productos
17. **InvitacionProcedimiento** - Invitaciones a proveedores
18. **Garantias** - Garantías de cumplimiento
19. **RecursosObjecion** - Recursos presentados
20. **ReajustePrecios** - Reajustes de precios
21. **SancionProveedores** - Sanciones
22. **FuncionariosInhibicion** - Funcionarios inhabilitados
23. **Sistemas** - Sistemas de compra
24. **SistemaEvaluacionOfertas** - Sistemas de evaluación
25. **Remates** - Remates públicos

---

## 💾 IndexedDB - Estructura de Almacenamiento

### Base de Datos: `SicopCache`

#### Object Store: `csvData`
```typescript
interface CachedData {
  id: string;                    // "Proveedores_2025_9_1234567890"
  fileInfo: {
    id: string;
    fileName: string;            // "Proveedores_unido.csv"
    year: number;                // 2025
    month: number;               // 9 (Septiembre)
    uploadDate: string;          // ISO string
    size: number;                // bytes
    recordCount: number;         // número de registros
    type: string;                // "Proveedores"
  };
  data: any[];                   // Datos normalizados
}
```

#### Object Store: `metadata`
```typescript
interface CacheMetadata {
  files: CachedFile[];           // Lista de archivos
  lastUpdated: string;           // Última actualización
  totalRecords: number;          // Total de registros
}
```

### Operaciones Disponibles

```typescript
// Guardar archivo
await cacheService.saveFile(fileName, data, year, month, type)

// Obtener archivo
const file = await cacheService.getFile(fileId)

// Obtener por tipo
const proveedores = await cacheService.getFilesByType('Proveedores')

// Filtrar por período
const files = await cacheService.getFilteredFiles(2025, 9, 'Contratos')

// Eliminar archivo
await cacheService.deleteFile(fileId)

// Limpiar todo
await cacheService.clearCache()

// Estadísticas
const stats = await cacheService.getCacheStats()
```

---

## 🔗 Relaciones entre Tablas

### Relaciones Principales

```
InstitucionesRegistradas (CEDULA)
    │
    ├─► DetalleCarteles (CEDULA_INSTITUCION)
    │       │
    │       ├─► DetalleLineaCartel (NRO_SICOP)
    │       │
    │       ├─► Ofertas (NRO_SICOP)
    │       │       │
    │       │       └─► LineasOfertadas (NRO_SICOP + NRO_OFERTA)
    │       │
    │       └─► LineasAdjudicadas (NRO_SICOP)
    │
    └─► Contratos (CEDULA_INSTITUCION)
            │
            ├─► LineasContratadas (NRO_CONTRATO)
            │
            ├─► OrdenPedido (NRO_CONTRATO)
            │
            └─► Recepciones (NRO_CONTRATO)

Proveedores (CEDULA_PROVEEDOR)
    │
    ├─► Ofertas (CEDULA_PROVEEDOR)
    │
    ├─► LineasAdjudicadas (CEDULA_PROVEEDOR)
    │
    ├─► Contratos (CEDULA_PROVEEDOR)
    │
    └─► SancionProveedores (CEDULA_PROVEEDOR)
```

### Campos Clave para Joins

| Tabla Origen | Campo | Tabla Destino | Campo |
|--------------|-------|---------------|-------|
| DetalleCarteles | `numeroCartel` | DetalleLineaCartel | `numeroCartel` |
| DetalleCarteles | `numeroCartel` | Ofertas | `numeroCartel` |
| DetalleCarteles | `numeroCartel` | LineasAdjudicadas | `numeroCartel` |
| DetalleCarteles | `codigoInstitucion` | InstitucionesRegistradas | `codigoInstitucion` |
| Ofertas | `idProveedor` | Proveedores | `idProveedor` |
| Contratos | `idProveedor` | Proveedores | `idProveedor` |
| Contratos | `idContrato` | LineasContratadas | `idContrato` |

---

## 🎯 Componentes Principales

### 1. FileUploader
**Responsabilidad**: Cargar archivos CSV y guardarlos normalizados en caché

**Características**:
- Selección global de año/mes para batch
- Drag & drop múltiple
- Parser con delimitador `;`
- Normalización automática de headers
- Progress tracking

```typescript
// Uso
<FileUploader 
  onUploadComplete={(files) => console.log('Archivos cargados:', files)}
/>
```

### 2. HeaderNormalizationService
**Responsabilidad**: Normalizar nombres de columnas CSV a formato esperado

**API**:
```typescript
// Normalizar un registro
const normalized = headerNormalizationService.normalizeRecord(
  { NRO_SICOP: '123', CEDULA: '456' },
  'Proveedores'
)
// { numeroCartel: '123', idProveedor: '456' }

// Normalizar array completo
const normalized = headerNormalizationService.normalizeRecords(data, 'Proveedores')

// Verificar mapeo disponible
const hasMapping = headerNormalizationService.hasMapping('Proveedores') // true
```

### 3. CacheService
**Responsabilidad**: Gestionar IndexedDB para almacenamiento persistente

**API Principal**:
```typescript
// Guardar archivo
await cacheService.saveFile('Proveedores.csv', data, 2025, 9, 'Proveedores')

// Leer archivo
const file = await cacheService.getFile('Proveedores_2025_9_123456')

// Obtener metadatos
const metadata = await cacheService.getMetadata()

// Limpiar todo
await cacheService.clearCache()
```

### 4. DataLoaderService
**Responsabilidad**: Cargar datos del caché al DataManager

**Proceso**:
1. Lee todos los archivos del caché
2. Consolida por tipo de archivo
3. Deduplica registros
4. Inyecta en DataManager

```typescript
// Verificar si hay datos
const hasData = await DataLoaderService.hasDataInCache()

// Obtener estadísticas
const stats = await DataLoaderService.getCacheStats()

// Cargar en DataManager
await DataLoaderService.loadDataFromCache((progress) => {
  console.log(`${progress}%`)
})
```

### 5. DataManager
**Responsabilidad**: Gestionar datos en memoria con índices y relaciones

**API de Consulta**:
```typescript
// Cargar datos desde memoria
await dataManager.loadDataFromMemory({
  'Proveedores': [...],
  'DetalleCarteles': [...],
  // ...
})

// Consultar datos
const instituciones = dataManager.getInstitucionesList()
const proveedores = dataManager.buscarProveedores('keyword')
const dashboard = dataManager.getDashboardMetrics({ institucion: ['001'] })

// Estado
const isLoaded = dataManager.isDataLoaded
const progress = dataManager.getLoadingProgress()

// Limpiar
dataManager.clearData()
```

---

## 🚀 Flujo Completo de Datos

### Escenario 1: Primera Carga

```
1. Usuario abre aplicación
   ↓
2. WelcomeScreen detecta: NO HAY DATOS
   ↓
3. Usuario hace clic en "Gestionar Datos"
   ↓
4. DataManagementHub abre en tab "Cargar Archivos"
   ↓
5. Usuario selecciona año: 2025, mes: Septiembre
   ↓
6. Usuario arrastra 25 archivos CSV
   ↓
7. FileUploader:
   - Parsea cada CSV con delimitador ;
   - Normaliza headers automáticamente
   - Guarda en IndexedDB
   ↓
8. Usuario hace clic en "Ir a Aplicación Principal"
   ↓
9. App.js:
   - Llama DataLoaderService.loadDataFromCache()
   - Consolida y deduplica datos
   - Inyecta en DataManager
   ↓
10. MainApp se renderiza con datos completos
```

### Escenario 2: Usuario Regresa

```
1. Usuario abre aplicación
   ↓
2. WelcomeScreen detecta: HAY DATOS EN CACHÉ
   ↓
3. Muestra estadísticas: "15 archivos, 250,000 registros"
   ↓
4. Usuario hace clic en "Ir a Aplicación"
   ↓
5. App.js carga datos desde caché → DataManager
   ↓
6. MainApp se renderiza (carga en ~2-5 segundos)
```

### Escenario 3: Limpiar y Empezar de Nuevo

```
1. Usuario en DataManagementHub
   ↓
2. Click en botón "Limpiar Caché" (rojo, ícono basura)
   ↓
3. Confirma: "¿Eliminar TODOS los datos?"
   ↓
4. CacheService.clearCache() borra IndexedDB
   ↓
5. Redirecciona a tab "Cargar Archivos"
   ↓
6. Usuario puede cargar nuevos datos
```

---

## 🔍 Validación de Datos

### FileValidationService

Valida automáticamente los archivos cargados:

```typescript
// Generar reporte
const report = await fileValidationService.generateValidationReport()

// Analizar archivos
const analysis = await fileValidationService.analyzeAllFiles()
// {
//   missingFileTypes: ['Remates'],
//   recommendations: ['Cargar archivo Remates para completar el dataset']
// }
```

### Validaciones Aplicadas

1. **Campos Requeridos**: Verifica que existan campos clave
2. **Duplicados**: Detecta registros duplicados
3. **Integridad Referencial**: Valida relaciones entre tablas
4. **Cobertura**: Identifica archivos faltantes

---

## 🎨 UI/UX - Flujo de Navegación

```
WelcomeScreen
├─► Gestionar Datos → DataManagementHub
│   ├─► Cargar Archivos (FileUploader)
│   ├─► Validación (ValidationReportPanel)
│   ├─► Gestionar Caché (CacheManager)
│   ├─► Analizar Datos (AdvancedConsolidation)
│   └─► [Botón] Limpiar Caché
│
└─► Ir a Aplicación → MainApp
    ├─► Dashboard
    ├─► Análisis por Institución
    ├─► Búsqueda de Proveedores
    └─► Reportes
```

---

## 📊 Monitoreo y Debug

### Logs en Consola

```typescript
// Normalización
console.log('✅ Normalizando headers para Proveedores:', {
  registrosOriginales: 1000,
  registrosNormalizados: 1000,
  primerRegistroOriginal: ['CEDULA', 'NOMBRE'],
  primerRegistroNormalizado: ['idProveedor', 'nombreProveedor']
})

// Carga desde caché
console.log('📥 Cargando tipo: Proveedores, archivos: 2')
console.log('✅ Consolidados 1000 registros Proveedores')

// DataManager
console.log('💾 Datos cargados en DataManager')
console.log('📊 Estadísticas:', dataManager.getDatasetSizes())
```

### Verificación en DevTools

```javascript
// Abrir consola del navegador
window.dataManager.isDataLoaded // true/false
window.dataManager.getDatasetSizes() // { Proveedores: 1000, ... }

// Verificar IndexedDB
// Application > Storage > IndexedDB > SicopCache
```

---

## ⚡ Optimizaciones

### 1. Deduplicación Inteligente
- Identifica campos únicos por tipo de archivo
- Elimina duplicados automáticamente

### 2. Consolidación por Tipo
- Agrupa archivos del mismo tipo
- Reduce fragmentación

### 3. Índices en DataManager
- Índices primarios y foráneos
- Joins optimizados O(1)

### 4. Carga Asíncrona
- Progress callbacks
- No bloquea UI

---

## 🛠️ Mantenimiento

### Agregar Nuevo Tipo de Archivo

1. **Agregar a HeaderNormalizationService.ts**:
```typescript
HEADER_MAPPINGS.NuevoTipo = {
  'campo_csv': 'campoNormalizado',
  // ...
}
```

2. **Agregar a FileUploader.tsx**:
```typescript
const CSV_TYPES = [
  // ...
  'NuevoTipo'
]
```

3. **Actualizar relations.ts** (si tiene relaciones):
```typescript
RELACIONES_TABLAS.push({
  tablaOrigen: 'NuevoTipo',
  campoOrigen: 'id',
  tablaDestino: 'OtraTabla',
  campoDestino: 'relacionId',
  tipo: 'uno-a-muchos'
})
```

### Modificar Mapeo de Headers

Editar `HeaderNormalizationService.ts`:
```typescript
Proveedores: {
  'nuevo_campo_csv': 'campoNormalizado',
  // ...
}
```

---

## 📝 Checklist de Desarrollo

- ✅ PapaParse con delimitador `;`
- ✅ Normalización automática de headers
- ✅ IndexedDB con keyPath `id`
- ✅ Año/mes global para batch
- ✅ Botón limpiar caché
- ✅ Validación de datos
- ✅ Progress tracking
- ✅ Deduplicación
- ✅ Consolidación por tipo
- ✅ DataManager con datos normalizados
- ✅ Navegación completa WelcomeScreen ↔ DataManagementHub ↔ MainApp

---

## 🎓 Conclusión

El sistema está diseñado para:
1. **Flexibilidad**: Mapea automáticamente diferentes formatos de headers
2. **Robustez**: Valida y deduplica datos
3. **Escalabilidad**: IndexedDB maneja grandes volúmenes
4. **UX**: Interfaz intuitiva con feedback visual
5. **Mantenibilidad**: Arquitectura modular y documentada

Todos los componentes trabajan juntos para garantizar que los datos fluyan correctamente desde los archivos CSV hasta DataManager, sin importar las variaciones en los headers originales.
