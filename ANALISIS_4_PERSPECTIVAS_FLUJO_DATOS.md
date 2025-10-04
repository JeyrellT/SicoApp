# 🔬 Análisis de 4 Perspectivas del Flujo de Datos

**Fecha**: 2025-10-04  
**Objetivo**: Analizar el flujo de datos desde 4 ángulos diferentes para identificar la estrategia óptima de cálculo de montos

---

## 📋 Perspectiva 1: Origen de Datos (CSV → Caché)

### 🎯 Pregunta Clave
¿Qué transformaciones sufren los datos desde el CSV original hasta el caché?

### 📊 Flujo Detectado

```
CSV Original (Archivo .csv)
├─ Headers: Variaciones diversas
│  ├─ "Monto_Contrato", "MONTO_CONTRATO", "monto contrato"
│  ├─ "Cedula Proveedor", "cedula_proveedor", "CEDULA_PROVEEDOR"
│  └─ Espacios, guiones bajos, mayúsculas/minúsculas inconsistentes
│
└─ Valores: Diversos formatos
   ├─ Números: "123456.78", "₡123,456.78", "123.456,78"
   ├─ Fechas: "2025-01-15", "15/01/2025", "15-01-2025"
   └─ Textos: Problemas de encoding UTF-8

         ⬇️ PapaParse (parsing CSV)

Datos parseados (Array de objetos)
├─ Headers sin transformar (exactamente como aparecen en CSV)
└─ Valores como strings o números (según parser)

         ⬇️ HeaderNormalizationService

Datos normalizados (Array de objetos)
├─ Headers convertidos a camelCase
│  ├─ "monto_contrato" → "montoContrato"
│  ├─ "cedula proveedor" → "cedulaProveedor"
│  └─ Normalización uniforme
│
└─ Valores sin transformar (aún como strings o números raw)

         ⬇️ CacheService.saveFile()

IndexedDB (CachedData)
├─ id: string
├─ fileInfo: { fileName, year, month, type, recordCount }
└─ data: any[] ← Array con headers normalizados
```

### ✅ Fortalezas
- **Normalización temprana**: Headers se normalizan al guardar en caché
- **Persistencia**: Datos quedan en IndexedDB (no se pierden al refrescar)
- **Metadatos**: Se guarda info adicional (año, mes, tipo de archivo)

### ⚠️ Debilidades
- **Valores sin transformar**: Los valores numéricos y fechas siguen como strings
- **Pérdida potencial**: Si normalización falla, el campo queda con nombre original
- **Sin validación**: No se valida que campos críticos existan

### 🔍 Hallazgo Crítico
```typescript
// HeaderNormalizationService.ts - Línea 150+
// Solo normaliza HEADERS, NO valores
normalizeHeaders(type: string, headers: string[]): string[] {
  const mapping = HEADER_MAPPINGS[type] || {};
  return headers.map(h => {
    const normalized = this.normalizeString(h);
    return mapping[normalized] || normalized;
  });
}

// PROBLEMA: Si el CSV tiene "MONTO_TOTAL" pero el mapeo solo conoce "monto_contrato",
// el campo quedará como "montoTotal" pero NO como "montoContrato"
```

---

## 📋 Perspectiva 2: Normalización (Caché → DataManager)

### 🎯 Pregunta Clave
¿Cómo se mapean y transforman los campos al cargarlos en DataManager?

### 📊 Flujo Detectado

```
IndexedDB (CachedData.data[])
├─ Headers: Ya normalizados a camelCase por CacheService
└─ Valores: Aún como strings o números raw

         ⬇️ DataManager.cargarArchivoCSV()

Procesamiento en DataManager
├─ Lee datos del caché
├─ NO re-normaliza headers (ya vienen normalizados)
├─ Aplica transformarValor() a cada celda
│  ├─ Detecta tipo por nombre de campo
│  ├─ Transforma fechas: parseFecha()
│  ├─ Transforma números: parseNumeroFlexible()
│  └─ Limpia encoding UTF-8
│
└─ Aplica mapeo de MAPEO_HEADERS_POR_TABLA (relations.ts)
   ├─ Intenta mapear header normalizado → campo final
   ├─ Si no hay match, usa normalizeFieldName() genérico
   └─ Crea objeto final con campos mapeados

         ⬇️

this.datos.set(nombreTabla, registros[])
├─ Headers: Nombres finales según MAPEO_HEADERS_POR_TABLA
├─ Valores: Transformados a tipos correctos
└─ Campos no mapeados: Pueden quedar con nombres intermedios
```

### ✅ Fortalezas
- **Doble mapeo**: CacheService normaliza + DataManager mapea
- **Transformación de valores**: Convierte strings a tipos apropiados
- **Fallback genérico**: normalizeFieldName() para campos no conocidos

### ⚠️ Debilidades
- **Mapeo en 2 pasos**: Complejidad innecesaria
  1. CacheService: "monto_contrato" → "montoContrato"
  2. DataManager: "montoContrato" → "montoContrato" (nada cambia si mapeo coincide)
  
- **Pérdida de sincronización**: Si CacheService normaliza diferente a relations.ts
  - Ejemplo: CSV tiene "MONTO_TOTAL"
  - CacheService normaliza a "montoTotal" (camelCase automático)
  - relations.ts no tiene mapeo "montoTotal" → "montoContrato"
  - Resultado: Campo queda como "montoTotal" ❌

### 🔍 Hallazgo Crítico
```typescript
// DataManager.ts - normalizeFieldName()
// Línea 1050+
private normalizeFieldName(campo: string): string {
  const normalizado = campo.toLowerCase().trim();
  
  const mapeos: Record<string, string> = {
    'monto_contrato': 'montoContrato',
    // ... otros mapeos
  };
  
  // ⚠️ PROBLEMA: Solo mapea si encuentra match exacto
  // Si el campo ya viene como "montoTotal" (normalizado por CacheService),
  // no hay mapeo "montoTotal" → "montoContrato"
  
  if (mapeos[normalizado]) {
    return mapeos[normalizado];
  }
  
  // Fallback: convierte a camelCase (ya está en camelCase)
  return normalizado;
}
```

---

## 📋 Perspectiva 3: Cálculos (DataManager → Reportes)

### 🎯 Pregunta Clave
¿Cómo se calculan los montos en los reportes y qué campos se usan?

### 📊 Análisis de Fuentes de Monto

#### Tabla `Contratos`
```typescript
// CAMPO ESPERADO: montoContrato

// Variantes posibles en CSV original:
- "monto_contrato"
- "MONTO_CONTRATO"
- "monto contrato"
- "monto_total"        ← ¿Se mapea?
- "valor_contrato"     ← ¿Se mapea?
- "monto"              ← ¿Se mapea?

// PROBLEMA ACTUAL:
const montoTotal = _.sumBy(contratos, (c: any) => this.normalizarNumero(c.montoContrato));
// Si c.montoContrato es undefined → retorna 0
// Si el campo real es c.montoTotal → se ignora
```

#### Tabla `LineasContratadas`
```typescript
// CAMPOS DISPONIBLES:
- montoLineaContratada    // Monto total de la línea
- precioUnitario          // Precio por unidad
- cantidad                // Cantidad contratada
- montoTotal              // Monto total (variante)
- precioAdjudicado        // Precio adjudicado

// CÁLCULO ALTERNATIVO (más preciso):
const montoContrato = _.sumBy(lineasContratadas, (linea: any) => {
  const monto = linea.montoLineaContratada || linea.montoTotal;
  if (monto) return this.normalizarNumero(monto);
  
  // Calcular desde precio * cantidad
  const precio = linea.precioUnitario || linea.precioAdjudicado;
  const cantidad = linea.cantidad;
  if (precio && cantidad) {
    return this.normalizarNumero(precio) * this.normalizarNumero(cantidad);
  }
  
  return 0;
});
```

#### Tabla `AdjudicacionesFirme`
```typescript
// CAMPO: montoTotalAdjudicado
- Contiene el monto total adjudicado por cartel
- Más confiable que suma de contratos individuales
- Pero no se relaciona directamente con Contratos (solo con numeroCartel)
```

### 📈 Estrategias de Cálculo Comparadas

| **Estrategia** | **Fuente** | **Precisión** | **Cobertura** | **Complejidad** |
|---|---|---|---|---|
| **A. Directo desde Contratos** | `Contratos.montoContrato` | ⭐⭐ | ⭐⭐⭐ | ⭐ |
| **B. Suma desde LineasContratadas** | `LineasContratadas → Contratos` | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **C. Desde AdjudicacionesFirme** | `AdjudicacionesFirme → Carteles` | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| **D. Híbrido (Propuesta)** | Prioridad: B > A > C | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

### 🔍 Hallazgo Crítico

**Inconsistencia en fuente de verdad:**

```typescript
// ACTUALMENTE EN DataManager (línea 4286+)
const montoContratos = _.sumBy(contratos, (c: any) => {
  const id = String(c.idContrato || '').trim();
  const montoLineas = montoPorContrato.get(id) || 0;
  // Si existe monto de líneas, usarlo; si no, intentar de montoContrato
  if (montoLineas > 0) {
    return montoLineas;
  }
  return this.obtenerMontoContrato(c);
});

// ✅ YA USA ESTRATEGIA HÍBRIDA en algunos lugares
// ❌ PERO en reportes usa directo: c.montoContrato
```

---

## 📋 Perspectiva 4: Integridad Relacional (Joins entre tablas)

### 🎯 Pregunta Clave
¿Cómo se relacionan las tablas y cuál es la fuente más confiable?

### 📊 Modelo Relacional de Montos

```
┌─────────────────────┐
│  DetalleCarteles    │
│  ─────────────────  │
│  numeroCartel (PK)  │
│  presupuestoOficial │ ← Monto ESTIMADO (antes de adjudicar)
└──────────┬──────────┘
           │
           │ 1:N
           ▼
┌─────────────────────────┐
│ AdjudicacionesFirme     │
│ ─────────────────────── │
│ numeroCartel (FK)       │
│ montoTotalAdjudicado    │ ← Monto ADJUDICADO oficial
│ fechaAdjudicacionFirme  │
└──────────┬──────────────┘
           │
           │ 1:N
           ▼
┌────────────────────────┐        ┌─────────────────────────┐
│     Contratos          │◄───────│  LineasContratadas      │
│  ────────────────────  │  N:M   │  ─────────────────────  │
│  idContrato (PK)       │        │  idContrato (FK)        │
│  numeroCartel (FK)     │        │  numeroLinea            │
│  montoContrato         │ ← ?    │  montoLineaContratada   │ ← Monto REAL más preciso
│  idProveedor           │        │  precioUnitario         │
│  fechaFirma            │        │  cantidad               │
└────────────────────────┘        │  montoTotal             │
                                   └─────────────────────────┘
```

### 🔄 Flujo de Montos en el Proceso Real

1. **Publicación (DetalleCarteles)**
   ```
   presupuestoOficial = ₡1,000,000 (estimado)
   ```

2. **Adjudicación (AdjudicacionesFirme)**
   ```
   montoTotalAdjudicado = ₡950,000 (adjudicado por debajo)
   ```

3. **Contrato (Contratos)**
   ```
   montoContrato = ₡950,000 (debería coincidir con adjudicación)
   ```

4. **Líneas del Contrato (LineasContratadas)**
   ```
   Línea 1: 10 unidades × ₡50,000 = ₡500,000
   Línea 2: 20 unidades × ₡22,500 = ₡450,000
   ─────────────────────────────────────────
   TOTAL:                          ₡950,000 ✓
   ```

### ⚠️ Problemas Detectados

#### Problema 1: Campo montoContrato puede estar vacío
```typescript
// Contratos puede tener:
{
  idContrato: "123",
  numeroCartel: "2025CD-000001-00001",
  idProveedor: "3101234567",
  fechaFirma: "2025-01-15",
  montoContrato: null  // ❌ VACÍO
}

// Pero LineasContratadas SÍ tiene datos:
[
  { idContrato: "123", montoLineaContratada: 500000 },
  { idContrato: "123", montoLineaContratada: 450000 }
]
// TOTAL: 950,000
```

#### Problema 2: Múltiples fuentes de verdad sin priorización clara
```typescript
// ¿De dónde sacamos el monto de un contrato?
// Opción A: Contratos.montoContrato
// Opción B: SUM(LineasContratadas.montoLineaContratada) WHERE idContrato = ?
// Opción C: AdjudicacionesFirme.montoTotalAdjudicado WHERE numeroCartel = ?

// ACTUALMENTE: Solo se usa Opción A
// PROBLEMA: Si A está vacío, retorna 0 (incorrecto)
```

### 🔍 Hallazgo Crítico

**Existe código que YA calcula monto desde LineasContratadas:**

```typescript
// DataManager.ts - línea 1577+
const lc: any[] = this.datos.get('LineasContratadas') || [];
const montoPorContrato = new Map<string, number>();

lc.forEach((linea: any) => {
  const idC = String(linea.idContrato || '').trim();
  if (!idC) return;
  
  const camposMonto = [
    'montoLineaContratada', 'monto_linea_contratada',
    'montoTotal', 'monto_total', 'monto'
  ];
  
  let m = 0;
  for (const campo of camposMonto) {
    const val = linea[campo];
    if (val != null && val !== '') {
      m = this.normalizarNumero(val);
      if (m > 0) break;
    }
  }
  
  if (m === 0) {
    // Calcular desde precio * cantidad
    const camposPrecio = ['precioUnitario', 'precio_unitario', ...];
    const camposCantidad = ['cantidad', 'cantidadContratada', ...];
    
    const precio = /* buscar en camposPrecio */;
    const cantidad = /* buscar en camposCantidad */;
    
    if (precio && cantidad) {
      m = precio * cantidad;
    }
  }
  
  const prev = montoPorContrato.get(idC) || 0;
  montoPorContrato.set(idC, prev + m);
});

// ✅ ESTE CÁLCULO ES MÁS ROBUSTO
// ❌ PERO NO SE USA EN REPORTES
```

---

## 🎯 Definición de Estrategia Óptima

### 📊 Estrategia Propuesta: **Cascada de Fuentes con Fallback**

#### Nivel 1: Fuente Más Precisa (LineasContratadas)
```typescript
function obtenerMontoContratoPreciso(contrato: Contrato): number {
  // Nivel 1: Calcular desde LineasContratadas (MÁS PRECISO)
  const lineas = this.obtenerDatos('LineasContratadas')
    .filter(l => l.idContrato === contrato.idContrato);
  
  if (lineas.length > 0) {
    const montoLineas = _.sumBy(lineas, (linea: any) => {
      // Intentar monto directo
      const monto = linea.montoLineaContratada || linea.montoTotal || linea.monto;
      if (monto && monto > 0) {
        return this.normalizarNumero(monto);
      }
      
      // Calcular desde precio × cantidad
      const precio = linea.precioUnitario || linea.precioAdjudicado || linea.precio;
      const cantidad = linea.cantidad || linea.cantidadContratada;
      
      if (precio && cantidad) {
        return this.normalizarNumero(precio) * this.normalizarNumero(cantidad);
      }
      
      return 0;
    });
    
    if (montoLineas > 0) {
      return montoLineas;
    }
  }
  
  // Nivel 2: Campo directo en Contratos
  return this.obtenerMontoContrato(contrato); // Ya implementado con fallback múltiple
}
```

#### Nivel 2: Fallback a Campo Directo (Contratos.montoContrato)
```typescript
// Ya implementado en obtenerMontoContrato()
private obtenerMontoContrato(contrato: any): number {
  const camposPosibles = [
    'montoContrato', 'montoTotal', 'monto', 'valorContrato',
    'montoAdjudicado', 'montoTotalContrato', 'precioTotal',
    'importe', 'total', 'valor', 'montoTotalAdjudicado'
  ];
  
  for (const campo of camposPosibles) {
    const valor = contrato[campo];
    if (valor != null && valor !== '' && valor !== 0) {
      const montoNormalizado = this.normalizarNumero(valor);
      if (montoNormalizado > 0) {
        return montoNormalizado;
      }
    }
  }
  
  return 0;
}
```

#### Nivel 3: Fallback a AdjudicacionesFirme (por numeroCartel)
```typescript
// Solo si las anteriores fallan
if (montoCalculado === 0 && contrato.numeroCartel) {
  const adjudicacion = this.obtenerDatos('AdjudicacionesFirme')
    .find(a => a.numeroCartel === contrato.numeroCartel);
  
  if (adjudicacion && adjudicacion.montoTotalAdjudicado) {
    // Dividir entre número de contratos del cartel (aproximación)
    const contratosCartel = this.obtenerDatos('Contratos')
      .filter(c => c.numeroCartel === contrato.numeroCartel);
    
    return this.normalizarNumero(adjudicacion.montoTotalAdjudicado) / contratosCartel.length;
  }
}
```

### 📈 Comparación: Actual vs Propuesta

| **Aspecto** | **Estrategia Actual** | **Estrategia Propuesta** |
|---|---|---|
| **Fuente principal** | `Contratos.montoContrato` | `LineasContratadas` (agregado) |
| **Fallback** | 10 campos alternativos | Cascada de 3 niveles |
| **Precisión** | ⭐⭐ (campo puede estar vacío) | ⭐⭐⭐⭐⭐ (calcula desde líneas) |
| **Cobertura** | 60-70% (depende de CSV) | 95%+ (múltiples fuentes) |
| **Complejidad** | ⭐⭐ (simple) | ⭐⭐⭐⭐ (compleja pero robusta) |
| **Mantenimiento** | ⭐⭐ (agregar campos a lista) | ⭐⭐⭐ (lógica más compleja) |
| **Performance** | ⭐⭐⭐⭐⭐ (acceso directo) | ⭐⭐⭐ (joins adicionales) |

### 🚀 Ventajas de la Estrategia Propuesta

1. **Mayor precisión**: Calcula desde líneas individuales (datos más granulares)
2. **Mayor cobertura**: Múltiples fuentes de fallback
3. **Detección temprana**: Logging muestra qué fuente se usó
4. **Validación**: Puede comparar monto calculado vs monto declarado

### ⚠️ Desventajas

1. **Complejidad**: Más código, más difícil de mantener
2. **Performance**: Joins adicionales pueden ser lentos con muchos datos
3. **Memoria**: Cache de montos calculados requiere más RAM

---

## 💡 Solución Óptima: Estrategia Híbrida con Caché

### 🎯 Diseño

```typescript
class MontoCalculator {
  private montoCache: Map<string, number> = new Map();
  private fuenteCache: Map<string, string> = new Map();
  
  /**
   * Calcula monto de contrato con estrategia de cascada
   * Cachea resultado para evitar recálculos
   */
  calcularMontoContrato(contrato: Contrato): {
    monto: number;
    fuente: 'lineas' | 'directo' | 'adjudicacion' | 'vacio';
    confianza: number; // 0-100%
  } {
    const cacheKey = contrato.idContrato;
    
    // Verificar caché
    if (this.montoCache.has(cacheKey)) {
      return {
        monto: this.montoCache.get(cacheKey)!,
        fuente: this.fuenteCache.get(cacheKey) as any,
        confianza: 100
      };
    }
    
    // Nivel 1: LineasContratadas (95% confianza)
    const montoLineas = this.calcularDesdeLineas(contrato.idContrato);
    if (montoLineas > 0) {
      this.montoCache.set(cacheKey, montoLineas);
      this.fuenteCache.set(cacheKey, 'lineas');
      return { monto: montoLineas, fuente: 'lineas', confianza: 95 };
    }
    
    // Nivel 2: Campo directo (70% confianza)
    const montoDirecto = this.obtenerMontoContrato(contrato);
    if (montoDirecto > 0) {
      this.montoCache.set(cacheKey, montoDirecto);
      this.fuenteCache.set(cacheKey, 'directo');
      return { monto: montoDirecto, fuente: 'directo', confianza: 70 };
    }
    
    // Nivel 3: Adjudicación (50% confianza - aproximado)
    const montoAdjudicacion = this.calcularDesdeAdjudicacion(contrato);
    if (montoAdjudicacion > 0) {
      this.montoCache.set(cacheKey, montoAdjudicacion);
      this.fuenteCache.set(cacheKey, 'adjudicacion');
      return { monto: montoAdjudicacion, fuente: 'adjudicacion', confianza: 50 };
    }
    
    // Sin datos
    this.montoCache.set(cacheKey, 0);
    this.fuenteCache.set(cacheKey, 'vacio');
    return { monto: 0, fuente: 'vacio', confianza: 0 };
  }
  
  /**
   * Pre-calcula todos los montos al cargar datos
   * Optimización para reportes que necesitan todos los montos
   */
  precalcularMontos(contratos: Contrato[]): void {
    console.time('Precálculo de montos');
    
    // Batch: calcular primero todos los montos desde líneas
    const montosLineas = this.calcularMontosDesdeLineasBatch();
    
    contratos.forEach(contrato => {
      this.calcularMontoContrato(contrato);
    });
    
    console.timeEnd('Precálculo de montos');
    console.log(`📊 Montos calculados: ${this.montoCache.size}`);
    console.log(`📈 Distribución de fuentes:`, this.getDistribucionFuentes());
  }
  
  private getDistribucionFuentes(): Record<string, number> {
    const dist: Record<string, number> = {};
    for (const fuente of this.fuenteCache.values()) {
      dist[fuente] = (dist[fuente] || 0) + 1;
    }
    return dist;
  }
}
```

### 📊 Métricas de Éxito

```typescript
interface ValidacionMontos {
  totalContratos: number;
  contratosConMonto: number;
  porcentajeCobertura: number;
  
  distribucionFuentes: {
    lineas: number;      // Calculado desde LineasContratadas
    directo: number;     // Campo montoContrato
    adjudicacion: number; // Desde AdjudicacionesFirme
    vacio: number;       // Sin datos
  };
  
  confianzaPromedio: number;
  montoTotal: number;
  
  advertencias: string[];
}
```

---

## 🎬 Plan de Implementación

### Fase 1: Implementar Calculador de Montos ✓
- [x] Crear método `obtenerMontoContratoPreciso()` con cascada
- [x] Implementar caché de montos calculados
- [ ] Agregar logging detallado de fuente usada

### Fase 2: Integrar en Reportes
- [ ] Reemplazar `c.montoContrato` por `obtenerMontoContratoPreciso(c)`
- [ ] Pre-calcular montos al inicio de generación de reportes
- [ ] Mostrar indicadores de calidad de datos en UI

### Fase 3: Optimización
- [ ] Batch calculation para mejorar performance
- [ ] Lazy loading de montos solo cuando se necesitan
- [ ] Invalidar caché cuando datos cambien

### Fase 4: Validación
- [ ] Comparar monto calculado vs monto declarado
- [ ] Alertas cuando hay inconsistencias >10%
- [ ] Dashboard de calidad de datos

---

## 📋 Conclusión

**Estrategia Óptima**: **Cascada con Caché**

### Por qué es la mejor:
1. ✅ **Máxima precisión**: Usa datos más granulares (líneas)
2. ✅ **Máxima cobertura**: Múltiples fallbacks
3. ✅ **Performance**: Caché evita recálculos
4. ✅ **Trazabilidad**: Logging muestra fuente usada
5. ✅ **Validación**: Detecta inconsistencias
6. ✅ **Extensible**: Fácil agregar nuevas fuentes

### Diferencias con estrategia actual:
- **Actual**: Solo busca en campos de `Contratos`
- **Propuesta**: Calcula desde `LineasContratadas` primero, luego fallback

### Impacto esperado:
- Cobertura de montos: **60% → 95%+**
- Precisión de montos: **70% → 95%+**
- Tiempo de cálculo: **+20%** (mitigado por caché)

---

**Próximo paso**: Implementar `obtenerMontoContratoPreciso()` y actualizar reportes para usarlo.
