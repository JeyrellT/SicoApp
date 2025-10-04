# 🔍 Análisis Profundo: Problema de Montos en ₡0.0M

**Fecha**: 2025-10-04  
**Estado**: CRÍTICO - Montos no se están calculando correctamente en reportes

---

## 📊 Síntomas Observados

### Dashboard de Reportes
```
✗ Monto Total: ₡0.0M (INCORRECTO)
✓ Instituciones mostrando nombres correctamente
✓ Cantidad de licitaciones correcta
✗ Todos los montos en ₡0.0M

Ejemplo:
- MINISTERIO DE CULTURA JUVENTUD: 10 licitaciones • ₡0.0M ❌
- ASAMBLEA LEGISLATIVA: 12 licitaciones • ₡0.0M ❌
- Proveedores: Market Share 0.00%, Monto ₡0.00M ❌
```

---

## 🔄 Flujo de Datos Completo

### 1. **Origen: Archivos CSV**
```
📁 Archivos CSV originales (subidos por usuario)
   ├─ Headers originales del CSV (ej: "Monto_Contrato", "MONTO", etc.)
   └─ Datos en formato crudo
```

### 2. **Capa de Caché: CacheService**
**Archivo**: `src/services/CacheService.ts`

```typescript
interface CachedData {
  id: string;
  fileInfo: CachedFile;
  data: any[];  // ← Datos del CSV parseados
}
```

**Proceso**:
- Lee CSV con PapaParse
- **Normaliza headers** con `HeaderNormalizationService`
- Guarda en IndexedDB como `CachedData`

**Headers en Caché**:
```typescript
// Los headers se normalizan a camelCase:
"monto_contrato" → "montoContrato" ✓
"MONTO_CONTRATO" → "montoContrato" ✓
"Monto Contrato" → "montoContrato" ✓
```

### 3. **Capa de Mapeo: relations.ts**
**Archivo**: `src/data/relations.ts`

**Mapeo para tabla Contratos** (línea 817):
```typescript
Contratos: {
  'nro_contrato': 'idContrato',
  'numero_contrato': 'idContrato',
  'monto_contrato': 'montoContrato',  // ← MAPEO PRINCIPAL
  'fecha_firma': 'fechaFirma',
  'cedula_proveedor': 'idProveedor',
  'cedula_institucion': 'codigoInstitucion',
  'nro_sicop': 'numeroCartel',
  // ... más campos
}
```

**PROBLEMA POTENCIAL**: Solo mapea 'monto_contrato' → 'montoContrato'
- ¿Qué pasa si el CSV tiene 'MONTO_TOTAL'?
- ¿Qué pasa si tiene 'monto_adjudicado'?
- ¿Qué pasa si tiene 'valor_contrato'?

### 4. **Capa de Procesamiento: DataManager**
**Archivo**: `src/data/DataManager.ts`

**Cálculo de montos** (usado en reportes):
```typescript
// Línea 3072 - generarResumenGeneral
const montoTotal = _.sumBy(contratos, (c: any) => 
  this.normalizarNumero(c.montoContrato)  // ← BUSCA CAMPO 'montoContrato'
);

// Línea 3185 - analizarTendenciasMercado
const montoTotal = _.sumBy(contratos, (c: any) => 
  this.normalizarNumero(c.montoContrato)
);

// Línea 3315 - obtenerInstitucionesMasActivas
monto: _.sumBy(contratosInst, (c: any) => 
  this.normalizarNumero(c.montoContrato)
)
```

**Método de normalización**:
```typescript
// Línea 1142
private normalizarNumero(valor: any, fallback = 0): number {
  if (typeof valor === 'number') {
    return isNaN(valor) ? fallback : valor;
  }
  if (valor == null || valor === '') return fallback;  // ← Retorna 0 si es null
  const parsed = this.parseNumeroFlexible(String(valor));
  return parsed != null && !isNaN(parsed) ? parsed : fallback;
}
```

**PROBLEMA**: Si `c.montoContrato` es `undefined` o `null`, retorna 0

### 5. **Componentes de Reportes**
**Archivo**: `src/components/ReportsPanel.tsx`

```typescript
const reporteEjecutivo = useMemo(() => {
  return reportService.generarReporteEjecutivo({
    periodo: filters.periodo,
    sectores: filters.sectores.length > 0 ? filters.sectores : undefined,
    incluirOportunidades: filters.incluirOportunidades
  });
}, [filters]);

// Muestra en UI:
<div>{formatearMonto(resumenGeneral.montoTotalAdjudicado)}</div>
// Si montoTotalAdjudicado = 0 → muestra "₡0.0M"
```

---

## 🐛 Causas Raíz Identificadas

### Causa #1: Campo no existe en el registro
```typescript
const contrato = {
  idContrato: "123",
  idProveedor: "456",
  fechaFirma: "2025-01-15",
  // montoContrato: undefined ← CAMPO NO EXISTE
}

_.sumBy([contrato], c => c.montoContrato)  // → 0
```

### Causa #2: Mapeo incompleto
```
CSV real:           Mapeo actual:        Resultado:
-----------------------------------------------------------------
"MONTO_TOTAL"       No mapeado           montoContrato = undefined
"valor_contrato"    No mapeado           montoContrato = undefined
"monto_adjudicado"  No mapeado           montoContrato = undefined
```

### Causa #3: Valores null o vacíos
```typescript
const contrato = {
  montoContrato: null,     // o ""  o  "NULL"
}
normalizarNumero(null)  // → 0
```

### Causa #4: Normalización de headers fallida
```
Header CSV original:  "Monto del Contrato"
HeaderNormalizationService: "montoDelContrato" (camelCase)
Mapeo esperado: "monto_contrato" → "montoContrato"
❌ No hay match → campo queda como "montoDelContrato"
❌ DataManager busca "montoContrato" → undefined
```

---

## 🎯 Campos Críticos para Análisis

### En tabla `Contratos`:
```typescript
interface Contrato {
  idContrato: string;
  montoContrato: number;  // ← CAMPO CRÍTICO PARA REPORTES
  idProveedor: string;
  codigoInstitucion: string;
  fechaFirma: Date;
  // ... otros campos
}
```

### Variantes posibles en CSVs reales:
```
Variantes de "monto_contrato":
✓ monto_contrato
✓ MONTO_CONTRATO
✓ Monto_Contrato
? monto_total
? monto_total_contrato
? valor_contrato
? monto_adjudicado
? precio_total
? importe
? total_contrato
```

---

## 📋 Mapeos Actuales vs Necesarios

### Estado Actual en `relations.ts`

**Contratos (línea 817)**:
```typescript
Contratos: {
  'monto_contrato': 'montoContrato',  // ← ÚNICO MAPEO
}
```

**DetalleLineaCartel (línea 675)**:
```typescript
DetalleLineaCartel: {
  'precio_unitario_estimado': 'presupuestoLinea',
  'monto_reservado': 'montoReservado',
}
```

**LineasContratadas (línea 751)**:
```typescript
LineasContratadas: {
  'precio_unitario': 'precioUnitario',
  'precio_unitario_adjudicado': 'precioAdjudicado',
  'monto_total': 'montoTotal',
  'monto_linea_contratada': 'montoLineaContratada',
  'monto_aumentado': 'montoAumentado',
  'monto_disminuido': 'montoDisminuido',
}
```

**AdjudicacionesFirme (línea 846)**:
```typescript
AdjudicacionesFirme: {
  'monto_total_adjudicado': 'montoTotalAdjudicado',
}
```

### ⚠️ Inconsistencia Detectada:
- `LineasContratadas` tiene mapeo para `monto_total`
- `Contratos` NO tiene mapeo para `monto_total`
- Pero los reportes calculan sobre `Contratos.montoContrato`

---

## 🔧 Estrategia de Corrección

### 1. **Robustecer Mapeo de Montos en Contratos**

```typescript
Contratos: {
  // Variantes principales
  'monto_contrato': 'montoContrato',
  'monto': 'montoContrato',
  
  // Variantes alternativas comunes
  'monto_total': 'montoContrato',
  'monto_total_contrato': 'montoContrato',
  'valor_contrato': 'montoContrato',
  'monto_adjudicado': 'montoContrato',
  'precio_total': 'montoContrato',
  'importe': 'montoContrato',
  'total': 'montoContrato',
  'total_contrato': 'montoContrato',
  
  // Variantes en mayúsculas
  'MONTO_CONTRATO': 'montoContrato',
  'MONTO_TOTAL': 'montoContrato',
  'MONTO': 'montoContrato',
  
  // Variantes con espacios (pre-normalización)
  'monto contrato': 'montoContrato',
  'valor del contrato': 'montoContrato',
}
```

### 2. **Agregar Fallback Inteligente en DataManager**

```typescript
private obtenerMontoContrato(contrato: any): number {
  // Intentar múltiples variantes
  const camposPosibles = [
    'montoContrato',
    'montoTotal',
    'monto',
    'valorContrato',
    'montoAdjudicado',
    'precioTotal',
    'importe',
    'total'
  ];
  
  for (const campo of camposPosibles) {
    const valor = contrato[campo];
    if (valor != null && valor !== '') {
      return this.normalizarNumero(valor);
    }
  }
  
  return 0;
}
```

### 3. **Logging y Diagnóstico**

```typescript
private diagnosticarCamposMontos(tabla: string): void {
  const datos = this.obtenerDatos(tabla);
  if (!datos.length) return;
  
  const muestra = datos[0];
  const camposDisponibles = Object.keys(muestra);
  const camposRelacionadosConMonto = camposDisponibles.filter(c => 
    /monto|precio|total|valor|importe|amount/i.test(c)
  );
  
  console.warn(`[${tabla}] Campos de monto disponibles:`, camposRelacionadosConMonto);
  console.warn(`[${tabla}] Muestra de datos:`, {
    ...Object.fromEntries(
      camposRelacionadosConMonto.map(c => [c, muestra[c]])
    )
  });
}
```

### 4. **Validación de Integridad**

```typescript
private validarIntegridadMontos(): {
  tablaConProblemas: string[];
  advertencias: string[];
} {
  const problemas: string[] = [];
  const advertencias: string[] = [];
  
  // Validar Contratos
  const contratos = this.obtenerDatos('Contratos');
  const contratosSinMonto = contratos.filter(c => 
    !c.montoContrato || c.montoContrato === 0
  );
  
  if (contratosSinMonto.length > contratos.length * 0.5) {
    problemas.push('Contratos');
    advertencias.push(
      `⚠️ ${contratosSinMonto.length}/${contratos.length} contratos sin monto válido`
    );
  }
  
  return { tablaConProblemas: problemas, advertencias };
}
```

---

## 📝 Plan de Implementación

### Fase 1: Robustecer Mapeos ✓
1. Actualizar `relations.ts` con variantes de campos de monto
2. Agregar todas las variantes detectadas en análisis de CSVs

### Fase 2: Mejorar DataManager ✓
1. Implementar método `obtenerMontoContrato` con fallback
2. Reemplazar accesos directos a `c.montoContrato`
3. Agregar diagnóstico de campos disponibles

### Fase 3: Validación y Testing ✓
1. Agregar validación de integridad en carga de datos
2. Logging detallado de mapeo de campos
3. Tests con muestras de datos reales

### Fase 4: Documentación ✓
1. Documentar campos esperados vs reales
2. Guía de troubleshooting para montos en cero
3. Tabla de compatibilidad de formatos CSV

---

## 🚨 Puntos de Verificación

### ✓ Checklist de Corrección

- [ ] Mapeos de monto robustecidos en `relations.ts`
- [ ] Método de fallback implementado en `DataManager`
- [ ] Logging de diagnóstico agregado
- [ ] Validación de integridad implementada
- [ ] Tests con datos reales ejecutados
- [ ] Documentación actualizada
- [ ] UI actualizada con indicadores de calidad de datos

---

## 📊 Métricas de Éxito

**Antes**:
```
Montos válidos: 0/1237 contratos (0%)
Reportes funcionales: 0%
```

**Después** (objetivo):
```
Montos válidos: >90% de contratos
Reportes funcionales: 100%
Alertas tempranas si hay problemas de datos
```

---

## 🔗 Referencias Cruzadas

- **DataManager.ts**: Líneas 1142, 3072, 3185, 3296, 3315
- **relations.ts**: Líneas 817-842 (Contratos)
- **CacheService.ts**: Líneas 1-200 (CachedData)
- **ReportsPanel.tsx**: Líneas 42-52 (generarReporteEjecutivo)

---

**Próximos pasos**: Implementar correcciones en el orden especificado en Plan de Implementación
