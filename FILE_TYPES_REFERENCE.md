# 📋 Referencia de Tipos de Archivos SICOP

## ✅ Archivos Sincronizados (25 tipos)

Esta referencia documenta los **25 tipos de archivos CSV** que el sistema SICOP espera y procesa. Todos los componentes están sincronizados con esta lista.

### 🔗 Archivos Sincronizados:
- ✅ `src/data/DataManager.ts` - MAPEO_ARCHIVOS (fuente de verdad)
- ✅ `src/services/FileValidationService.ts` - FILE_SCHEMAS
- ✅ `src/components/FileUploader.tsx` - CSV_TYPES

---

## 📁 Lista Completa de Archivos Esperados

### 1️⃣ **INSTITUCIONES Y PROVEEDORES** (3 archivos)

| Archivo CSV | Nombre de Tabla | Descripción | Campos Requeridos |
|------------|----------------|-------------|-------------------|
| `InstitucionesRegistradas.csv` | InstitucionesRegistradas | Instituciones públicas registradas | CodigoInstitucion, NombreInstitucion |
| `Proveedores.csv` | Proveedores | Proveedores registrados (versión simple) | IdProveedor, NombreProveedor |
| `Proveedores_unido.csv` | Proveedores | Proveedores unificados con identificación | Cedula, Nombre |

### 2️⃣ **PROCEDIMIENTOS Y SISTEMAS** (4 archivos)

| Archivo CSV | Nombre de Tabla | Descripción | Campos Requeridos |
|------------|----------------|-------------|-------------------|
| `ProcedimientoAdjudicacion.csv` | ProcedimientoAdjudicacion | Procedimientos de licitación | NumeroCartel, CodigoInstitucion, TipoProcedimiento |
| `ProcedimientoADM.csv` | ProcedimientoADM | Procedimientos administrativos | NumeroCartel, CodigoInstitucion |
| `Sistemas.csv` | Sistemas | Sistemas de contratación | CodigoSistema, NombreSistema |
| `SistemaEvaluacionOfertas.csv` | SistemaEvaluacionOfertas | Metodologías de evaluación | NumeroCartel, TipoEvaluacion |

### 3️⃣ **CARTELES Y LÍNEAS** (3 archivos)

| Archivo CSV | Nombre de Tabla | Descripción | Campos Requeridos |
|------------|----------------|-------------|-------------------|
| `DetalleCarteles.csv` | DetalleCarteles | Información de carteles | NumeroCartel, NombreCartel |
| `DetalleLineaCartel.csv` | DetalleLineaCartel | Líneas solicitadas en carteles | NumeroCartel, NumeroLinea, DescripcionLinea |
| `FechaPorEtapas.csv` | FechaPorEtapas | Cronograma de procesos | NumeroCartel |

### 4️⃣ **OFERTAS Y PARTICIPACIÓN** (4 archivos)

| Archivo CSV | Nombre de Tabla | Descripción | Campos Requeridos |
|------------|----------------|-------------|-------------------|
| `Ofertas.csv` | Ofertas | Ofertas presentadas | NumeroCartel, IdProveedor |
| `LineasOfertadas.csv` | LineasOfertadas | Detalle de líneas ofertadas | NumeroCartel, NumeroLinea, IdProveedor |
| `LineasRecibidas.csv` | LineasRecibidas | Líneas recibidas en apertura | NumeroCartel, NumeroLinea |
| `InvitacionProcedimiento.csv` | InvitacionProcedimiento | Invitaciones a proveedores | NumeroCartel, IdProveedor |

### 5️⃣ **ADJUDICACIONES** (2 archivos)

| Archivo CSV | Nombre de Tabla | Descripción | Campos Requeridos |
|------------|----------------|-------------|-------------------|
| `LineasAdjudicadas.csv` | LineasAdjudicadas | Líneas adjudicadas | NumeroCartel, NumeroLinea, IdProveedorAdjudicado |
| `AdjudicacionesFirme.csv` | AdjudicacionesFirme | Adjudicaciones en firme | NumeroCartel, IdProveedor |

### 6️⃣ **CONTRATOS Y EJECUCIÓN** (5 archivos)

| Archivo CSV | Nombre de Tabla | Descripción | Campos Requeridos |
|------------|----------------|-------------|-------------------|
| `Contratos.csv` | Contratos | Contratos firmados | NumeroContrato, CodigoInstitucion, Proveedor, MontoTotal |
| `LineasContratadas.csv` | LineasContratadas | Líneas en contratos | NumeroContrato, NumeroLinea, Descripcion |
| `OrdenPedido.csv` | OrdenPedido | Órdenes de compra | NumeroOrden, NumeroContrato |
| `Recepciones.csv` | Recepciones | Recepción de bienes/servicios | NumeroContrato, NumeroRecepcion |
| `ReajustePrecios.csv` | ReajustePrecios | Reajustes de precios | NumeroContrato, NumeroReajuste |

### 7️⃣ **GARANTÍAS Y RIESGOS** (4 archivos)

| Archivo CSV | Nombre de Tabla | Descripción | Campos Requeridos |
|------------|----------------|-------------|-------------------|
| `Garantias.csv` | Garantias | Garantías de cumplimiento | NumeroContrato, TipoGarantia |
| `RecursosObjecion.csv` | RecursosObjecion | Recursos presentados | NumeroCartel, NumeroRecurso |
| `FuncionariosInhibicion.csv` | FuncionariosInhibicion | Inhibiciones de funcionarios | CodigoInstitucion, CedulaFuncionario |
| `SancionProveedores.csv` | SancionProveedores | Sanciones a proveedores | IdProveedor, TipoSancion |

### 8️⃣ **OTROS** (1 archivo)

| Archivo CSV | Nombre de Tabla | Descripción | Campos Requeridos |
|------------|----------------|-------------|-------------------|
| `Remates.csv` | Remates | Remates de bienes | NumeroRemate |

---

## 🔍 Validación Automática

El sistema realiza validación automática de:

### ✅ Archivos Completos
- Detecta automáticamente el tipo de archivo basado en el nombre
- Valida que todos los campos requeridos estén presentes
- Calcula porcentaje de completitud de datos

### ⚠️ Archivos Faltantes
El sistema identifica cuáles de los 25 archivos esperados NO han sido cargados:
- `InstitucionesRegistradas.csv`
- `Proveedores_unido.csv`
- `Contratos.csv`
- ... (y los demás tipos)

### 📊 Estructura de Datos
Para cada archivo validado, el sistema verifica:
- **Campos Requeridos**: Deben estar presentes (no vacíos)
- **Campos Opcionales**: Mejoran la completitud si están presentes
- **Cobertura**: Porcentaje de registros con datos completos

---

## 🎯 Flujo de Trabajo Recomendado

### 1. **Cargar Archivos Básicos** (Mínimo requerido)
```
✅ InstitucionesRegistradas.csv
✅ Proveedores_unido.csv
✅ DetalleCarteles.csv
✅ DetalleLineaCartel.csv
```

### 2. **Cargar Datos de Proceso**
```
✅ ProcedimientoAdjudicacion.csv
✅ Ofertas.csv
✅ LineasAdjudicadas.csv
```

### 3. **Cargar Datos de Contratación**
```
✅ Contratos.csv
✅ LineasContratadas.csv
✅ Recepciones.csv
```

### 4. **Cargar Datos Complementarios** (Opcional)
```
⚪ FechaPorEtapas.csv
⚪ Garantias.csv
⚪ RecursosObjecion.csv
⚪ SancionProveedores.csv
⚪ ... (resto de archivos)
```

---

## 🔧 Uso del Sistema

### Subir Archivos
1. Ve a la pestaña **"Subir"** en la aplicación
2. Arrastra y suelta los archivos CSV
3. El sistema detectará automáticamente el tipo de cada archivo
4. Asigna año y mes según corresponda
5. Haz clic en **"Subir Todos"**

### Validar Archivos
1. Después de la carga, ve a la pestaña **"Validar"**
2. Revisa el reporte de validación:
   - ✅ Archivos válidos
   - ⚠️ Archivos con problemas
   - ❌ Archivos faltantes
3. Sigue las recomendaciones para mejorar la completitud

### Gestionar Cache
1. Ve a la pestaña **"Gestionar"**
2. Visualiza archivos organizados por año/mes/tipo
3. Descarga consolidaciones
4. Elimina archivos obsoletos

---

## 📝 Notas Importantes

### Proveedores
El sistema acepta dos variantes:
- `Proveedores.csv` → Estructura simple (IdProveedor, NombreProveedor)
- `Proveedores_unido.csv` → Estructura con identificación (Cedula, Nombre)

**Ambos se mapean a la misma tabla interna: `Proveedores`**

### Normalización de Headers
El sistema normaliza automáticamente los nombres de columnas:
- Elimina acentos: `Número` → `Numero`
- Convierte a PascalCase: `numero_contrato` → `NumeroContrato`
- Maneja sinónimos: `Cédula` → `Cedula`

### Campos Flexibles
Algunos archivos permiten variaciones en campos opcionales sin afectar la validación básica.

---

## 🚀 Rendimiento

### Capacidad
- ✅ Soporta hasta **millones de registros** por archivo
- ✅ Cache persistente en **IndexedDB** (sin límite de tamaño del navegador)
- ✅ Consolidación multi-período eficiente

### Optimizaciones
- Indexación automática para búsquedas rápidas
- Consolidación lazy (solo cuando se solicita)
- Validación en paralelo para múltiples archivos

---

## 📞 Soporte

Para agregar nuevos tipos de archivo, modifica:
1. `src/data/relations.ts` → Agregar en `MAPEO_ARCHIVOS`
2. `src/services/FileValidationService.ts` → Agregar schema en `FILE_SCHEMAS`
3. `src/components/FileUploader.tsx` → Agregar tipo en `CSV_TYPES`

**Fecha de última sincronización**: Enero 2025
**Versión del sistema**: 1.0.0
