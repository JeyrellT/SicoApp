# Reporte de Análisis de CSV - Sistema SICOP

## 📊 Resumen Ejecutivo

**Total de archivos analizados:** 25  
**Archivos con esquema correcto:** 2 (InstitucionesRegistradas, Proveedores_unido)  
**Archivos con esquema incompleto:** 4 (Contratos, LineasContratadas, ProcedimientoAdjudicacion, SancionProveedores)  
**Archivos sin esquema:** 19  

---

## ✅ Archivos con Esquema CORRECTO

### 1. InstitucionesRegistradas.csv
- **Estado:** ✅ Esquema 100% correcto
- **Campos requeridos:** CEDULA, NOMBRE_INSTITUCION
- **Campos adicionales:** ZONA_GEO_INST, FECHA_INGRESO, FECHA_MOD
- **Registros:** ~533

### 2. Proveedores_unido.csv
- **Estado:** ✅ Esquema 100% correcto
- **Separador:** ; (punto y coma)
- **Campos requeridos:** Cédula Proveedor, Nombre Proveedor
- **Campos adicionales:** Tipo Proveedor, Tamaño Proveedor, Codigo Postal, Provincia, Canton, Distrito
- **Registros:** ~52,337

---

## ⚠️ Archivos con Esquema INCOMPLETO

### 1. Contratos.csv
**Problema:** El esquema actual no incluye 14 campos que existen en el archivo.

**Campos en archivo pero NO en esquema:**
- TIPO_MODIFICACION
- FECHA_NOTIFICACION
- FECHA_ELABORACION
- TIPO_AUTORIZACION
- TIPO_DISMINUCION
- VIGENCIA
- MONEDA
- FECHA_INI_SUSP
- FECHA_REINI_CONT
- PLAZO_SUSP
- FECHA_MODIFICACION
- FECHA_INI_PRORR
- FECHA_FIN_PRORR
- NRO_CONTRATO_WEB

**Esquema actual (parcial):**
```typescript
requiredFields: ['NRO_CONTRATO', 'CEDULA_INSTITUCION', 'CEDULA_PROVEEDOR']
optionalFields: ['SECUENCIA', 'NUMERO_PROCEDIMIENTO', 'NRO_SICOP', 'TIPO_CONTRATO']
```

**Esquema CORREGIDO sugerido:**
```typescript
requiredFields: ['NRO_CONTRATO', 'CEDULA_INSTITUCION', 'CEDULA_PROVEEDOR']
optionalFields: [
  'SECUENCIA', 'NUMERO_PROCEDIMIENTO', 'NRO_SICOP', 'TIPO_CONTRATO',
  'TIPO_MODIFICACION', 'FECHA_NOTIFICACION', 'FECHA_ELABORACION',
  'TIPO_AUTORIZACION', 'TIPO_DISMINUCION', 'VIGENCIA', 'MONEDA',
  'FECHA_INI_SUSP', 'FECHA_REINI_CONT', 'PLAZO_SUSP',
  'FECHA_MODIFICACION', 'FECHA_INI_PRORR', 'FECHA_FIN_PRORR',
  'NRO_CONTRATO_WEB'
]
```

---

### 2. LineasContratadas.csv
**Problema:** El esquema actual no incluye 15 campos importantes.

**Campos faltantes en esquema:**
- CANTIDAD_CONTRATADA
- PRECIO_UNITARIO
- TIPO_MONEDA
- DESCUENTO
- IVA
- OTROS_IMPUESTOS
- ACARREOS
- TIPO_CAMBIO_CRC
- TIPO_CAMBIO_DOLAR
- NRO_ACTO
- DESC_PRODUCTO
- cantidad_aumentada
- cantidad_disminuida
- monto_aumentado
- monto_disminuido

**Total de registros:** ~3,926 (¡TODOS con datos!)

---

### 3. ProcedimientoAdjudicacion.csv
**Problema:** El esquema solo incluye 3 campos requeridos de 30 totales.

**Campos faltantes importantes:**
- UNIDAD_MEDIDA
- MONTO_UNITARIO
- MONEDA_PRECIO_EST
- MONEDA_ADJUDICADA
- MONTO_ADJU_LINEA
- MONTO_ADJU_LINEA_CRC
- MONTO_ADJU_LINEA_USD
- FECHA_ADJUD_FIRME
- CEDULA_PROVEEDOR
- NOMBRE_PROVEEDOR
- OBJETO_GASTO
- NRO_SICOP
- TIPO_PROCEDIMIENTO
- MODALIDAD_PROCEDIMIENTO

---

### 4. SancionProveedores.csv
**Problema:** El esquema no incluye campos importantes del archivo.

**Campos reales del archivo:**
- NOMBRE_INSTITUCION ✅
- CEDULA_INSTITUCION ✅
- CODIGO_PRODUCTO ❌ (no está en esquema)
- DESCRIP_PRODUCTO ❌
- CEDULA_PROVEEDOR ✅
- NOMBRE_PROVEEDOR ✅
- TIPO_SANCION ✅
- DESCR_SANCION ✅
- INICIO_SANCION ❌
- FINAL_SANCION ❌
- ESTADO ❌
- NO_RESOLUCION ❌
- fecha_registro ❌

**Registros:** ~7 (NO 0 como mostraba antes)

---

## ❌ Archivos SIN Esquema de Validación (19 archivos)

### Archivos Críticos que NECESITAN esquema:

1. **AdjudicacionesFirme.csv** (~3,899 registros)
2. **DetalleCarteles.csv** (~1,555 registros)
3. **DetalleLineaCartel.csv** (~8,664 registros)
4. **FechaPorEtapas.csv** (~8,664 registros) - ¡27 columnas!
5. **FuncionariosInhibicion.csv** (~86,340 registros) - ¡Archivo más grande!
6. **Garantias.csv** (~1,077 registros)
7. **InvitacionProcedimiento.csv** (~736,295 registros) - ¡2º archivo más grande!
8. **LineasAdjudicadas.csv** (~4,611 registros)
9. **LineasOfertadas.csv** (~13,576 registros)
10. **LineasRecibidas.csv** (~2,939 registros)
11. **Ofertas.csv** (~11,609 registros)
12. **OrdenPedido.csv** (~23,533 registros)
13. **ProcedimientoADM.csv** (~5 registros)
14. **ReajustePrecios.csv** (~3 registros)
15. **Recepciones.csv** (~1,394 registros)
16. **RecursosObjecion.csv** (~261 registros)
17. **Remates.csv** (0 registros - archivo vacío)
18. **SistemaEvaluacionOfertas.csv** (~4,965 registros)
19. **Sistemas.csv** (~8,664 registros)

---

## 🔍 Hallazgos Importantes

### Separadores Detectados
- **Coma (,):** 24 archivos
- **Punto y coma (;):** 1 archivo (Proveedores_unido.csv)

### Patrones de Nombres de Campos
- **Mayúsculas con guiones bajos:** La mayoría (ej: `NRO_SICOP`, `CEDULA_PROVEEDOR`)
- **Mixto:** Algunos tienen minúsculas (ej: `fecha_registro`, `desc_producto`)
- **Espacios en nombres:** Solo Proveedores_unido (ej: `Cédula Proveedor`)
- **Caracteres especiales:** Proveedores_unido usa acentos (Cédula, Tamaño)

### Campos Comunes Entre Archivos
Los siguientes campos aparecen en múltiples archivos:

1. **NRO_SICOP** - 18 archivos (campo clave principal)
2. **CEDULA_PROVEEDOR** - 12 archivos
3. **CEDULA_INSTITUCION** - 10 archivos
4. **NRO_CONTRATO** - 5 archivos
5. **NUMERO_PROCEDIMIENTO** - 8 archivos
6. **TIPO_MONEDA** - 7 archivos
7. **fecha_registro** - 4 archivos

---

## 💡 Recomendaciones

### Prioridad ALTA
1. ✅ Completar esquema de **LineasContratadas.csv** (3,926 registros válidos esperando)
2. ✅ Completar esquema de **SancionProveedores.csv** (7 registros válidos esperando)
3. ✅ Completar esquema de **Contratos.csv**
4. ✅ Completar esquema de **ProcedimientoAdjudicacion.csv**

### Prioridad MEDIA
5. Crear esquemas para archivos con >10,000 registros:
   - InvitacionProcedimiento (736K registros)
   - FuncionariosInhibicion (86K registros)
   - OrdenPedido (23K registros)
   - LineasOfertadas (13K registros)
   - Ofertas (11K registros)

### Prioridad BAJA
6. Crear esquemas para archivos pequeños (<1,000 registros)
7. Investigar archivo **Remates.csv** (vacío - ¿es normal?)

---

## 📋 Siguiente Paso

El script generó esquemas sugeridos para todos los archivos sin validación. Estos están listos para copiar directamente a `FileValidationService.ts`.

**Ubicación del reporte completo:** `csv_analysis_report.json`
