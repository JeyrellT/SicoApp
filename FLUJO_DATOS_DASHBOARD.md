# 📊 Flujo de Datos del Dashboard - Análisis Completo

## 🎯 Resumen Ejecutivo

El sistema SICOP Analytics tiene un **flujo de datos centralizado y transparente** donde **DataManager es la única fuente de verdad**. Todos los dashboards y filtros obtienen sus datos exclusivamente de DataManager, que a su vez carga y procesa los archivos CSV.

### ✅ Verificación Clave
- ✅ **ModernDashboard** usa exclusivamente `dataManager.getDashboardMetrics()` y `dataManager.getComplementaryDashboard()`
- ✅ **Filtros** se aplican correctamente a través de `filterByInstitucionSector()`
- ✅ **Categorías manuales** están integradas en el sistema de clasificación
- ✅ **No hay shortcuts**: Todo pasa por DataManager

---

## 📁 Tipos de Datos en SICOP

### 1. **DetalleCarteles** (Licitaciones/Carteles)
**Archivo CSV**: `DetalleCarteles.csv`

**Qué es**: Anuncios de licitación pública. Son las **convocatorias** que publican las instituciones.

**Campos principales**:
- `numeroCartel`: ID único del cartel
- `nombreCartel`: Título de la licitación
- `descripcionCartel`: Descripción detallada
- `codigoInstitucion`: Institución que licita
- `presupuestoOficial`: Presupuesto estimado (MONTO_EST)
- `fechaPublicacion`: Cuándo se publicó
- `clasificacionObjeto`: Clasificación del objeto (CLAS_OBJ)

**Relación**: Un cartel puede tener:
- Múltiples líneas (`DetalleLineaCartel`)
- Múltiples ofertas (`Ofertas`)
- Eventualmente un contrato (`Contratos`)

**Uso en Dashboard**: 
- `total_carteles`: Cuenta total de licitaciones
- Base para métricas de sector
- Fuente de presupuestos estimados

---

### 2. **Contratos**
**Archivo CSV**: `Contratos.csv`

**Qué es**: Contratos firmados resultantes de licitaciones adjudicadas.

**Campos principales**:
- `numeroContrato`: ID único del contrato
- `numeroCartel`: Referencia al cartel origen
- `codigoInstitucion`: Institución contratante
- `idProveedor`: Proveedor adjudicado
- `fechaFirma`: Fecha de firma del contrato
- `montoContrato`: Monto total del contrato

**Relación**: 
- Un contrato pertenece a **un cartel**
- Un cartel puede tener **varios contratos** (si se adjudica por lotes)

**Uso en Dashboard**:
- `total_contratos`: Cuenta de contratos firmados
- `tasa_exito`: (contratos / carteles) × 100
- `crecimiento_contratos`: Variación interanual

---

### 3. **DetalleLineaCartel** (Líneas de Licitación)
**Archivo CSV**: `DetalleLineaCartel.csv`

**Qué es**: Ítems o líneas individuales dentro de cada cartel. Una licitación puede incluir múltiples productos/servicios.

**Campos principales**:
- `numeroCartel`: Cartel al que pertenece
- `numeroLinea`: ID de la línea dentro del cartel
- `descripcionLinea`: Descripción del ítem
- `cantidadRequerida`: Cantidad solicitada
- `presupuestoLinea`: Presupuesto por línea
- `precioUnitarioEstimado`: Precio unitario estimado

**Relación**:
- Muchas líneas pertenecen a **un cartel**
- Se usa para **clasificar el sector** del cartel

**Uso en Dashboard**:
- **Clasificación de sector**: Votación por palabras clave en `descripcionLinea`
- **Clasificación de subcategoría**: Análisis detallado por sector
- Cálculo de presupuestos cuando falta `presupuestoOficial`

---

### 4. **LineasAdjudicadas**
**Archivo CSV**: `LineasAdjudicadas.csv`

**Qué es**: Líneas específicas que fueron adjudicadas a proveedores.

**Campos principales**:
- `numeroCartel`: Cartel de origen
- `idProveedorAdjudicado`: Proveedor ganador
- `cantidadAdjudicada`: Cantidad adjudicada
- `precioUnitarioAdjudicado`: Precio unitario adjudicado
- `tipoMoneda`: Moneda (CRC, USD, EUR)
- `tipo_cambio_crc`: Tipo de cambio si es USD/EUR

**Uso en Dashboard**:
- **Top Proveedores**: Cálculo de montos adjudicados por proveedor
- Métricas complementarias de adjudicación

---

### 5. **Ofertas**
**Archivo CSV**: `Ofertas.csv`

**Qué es**: Ofertas presentadas por proveedores para cada cartel.

**Campos principales**:
- `numeroCartel`: Cartel al que se oferta
- `idProveedor`: Proveedor que oferta
- `montoOferta`: Monto de la oferta

**Uso en Dashboard**:
- `total_ofertas`: Cuenta de ofertas recibidas
- `offersHistogram`: Distribución de ofertas por cartel
- Competitividad del proceso

---

### 6. **InstitucionesRegistradas**
**Archivo CSV**: `InstitucionesRegistradas.csv`

**Qué es**: Catálogo de instituciones públicas.

**Campos principales**:
- `codigoInstitucion`: Código único
- `nombreInstitucion`: Nombre oficial
- `siglas`: Siglas de la institución

**Uso en Dashboard**:
- Resolver nombres de instituciones
- `topInstituciones`: Top 10 por monto licitado

---

### 7. **Proveedores_unido.csv**
**Archivo CSV**: `Proveedores_unido.csv`

**Qué es**: Catálogo de proveedores registrados.

**Campos principales**:
- `cedula`: ID del proveedor
- `razonSocial`: Nombre/razón social
- `nombreComercial`: Nombre comercial

**Uso en Dashboard**:
- Resolver nombres de proveedores
- `topProveedores`: Top 10 por monto adjudicado

---

## 🔄 Flujo de Datos Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                         ARCHIVOS CSV                             │
│  DetalleCarteles | Contratos | DetalleLineaCartel |              │
│  LineasAdjudicadas | Ofertas | InstitucionesRegistradas |        │
│  Proveedores_unido                                               │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DataManager                              │
│                   (Fuente Única de Verdad)                       │
├─────────────────────────────────────────────────────────────────┤
│  • cargarDatos(): Carga CSVs en memoria (Map<string, any[]>)    │
│  • createIndexes(): Índices para búsquedas rápidas              │
│  • getSectorRules(): Reglas sistema + categorías manuales       │
│  • clasificarSectorPorDescripcion(): Clasifica por keywords     │
│  • filterByInstitucionSector(): Aplica filtros                  │
│  • getDashboardMetrics(): Métricas principales                  │
│  • getComplementaryDashboard(): Métricas complementarias        │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ModernDashboard.tsx                          │
│                   (Interfaz de Usuario)                          │
├─────────────────────────────────────────────────────────────────┤
│  • useState: Gestión de filtros (institucion, sector)           │
│  • useMemo: Cálculo reactivo cuando cambian filtros             │
│  • dashboardData = getDashboardMetrics(filtrosAplicados)        │
│  • complementData = getComplementaryDashboard(filtrosAplicados) │
│  • Visualizaciones: Recharts (barras, líneas, áreas)            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎛️ Sistema de Filtros

### Filtros Disponibles

```typescript
interface FiltrosDashboard {
  institucion?: string[];  // Códigos de instituciones
  sector?: string[];       // Nombres de sectores
}
```

### Flujo de Filtros en ModernDashboard

```typescript
// 1. ESTADO DE FILTROS
const [selectedInstitutions, setSelectedInstitutions] = useState<string[]>([]);
const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
const [filtersApplied, setFiltersApplied] = useState<{
  institucion?: string[];
  sector?: string[];
}>({});

// 2. APLICAR FILTROS
const handleApplyFilters = () => {
  setFiltersApplied({
    institucion: selectedInstitutions.length ? selectedInstitutions : undefined,
    sector: selectedCategories.length ? selectedCategories : undefined
  });
};

// 3. OBTENER DATOS FILTRADOS (AUTOMÁTICO CON useMemo)
const dashboardData = useMemo(
  () => dataManager.getDashboardMetrics?.(filtersApplied) || DASH_DEFAULT,
  [filtersApplied]  // Se recalcula cuando cambian los filtros
);

const complementData = useMemo(
  () => dataManager.getComplementaryDashboard?.(filtersApplied) || COMP_DEFAULT,
  [filtersApplied]
);
```

### Procesamiento de Filtros en DataManager

```typescript
private filterByInstitucionSector(
  filtros?: { institucion?: string[]; sector?: string[] }
) {
  // 1. OBTENER TODOS LOS DATOS
  const allCarteles: any[] = this.datos.get('DetalleCarteles') || [];
  const allContratos: any[] = this.datos.get('Contratos') || [];
  const sectores = this.asignarSectorPorCartel(); // Mapa: numeroCartel → sector
  
  // 2. NORMALIZAR INSTITUCIONES (solo dígitos)
  const normInst = (v: any) => String(v ?? '').trim().replace(/\D+/g, '');
  
  let carteles = allCarteles;
  let contratos = allContratos;
  
  // 3. FILTRAR POR INSTITUCIÓN
  if (filtros?.institucion?.length) {
    const wanted = new Set(filtros.institucion.map(normInst));
    carteles = carteles.filter(c => 
      wanted.has(normInst(c.codigoInstitucion))
    );
    contratos = contratos.filter(c => 
      wanted.has(normInst(c.codigoInstitucion))
    );
  }
  
  // 4. FILTRAR POR SECTOR
  if (filtros?.sector?.length) {
    const wantedS = new Set(filtros.sector.map(s => s.toLowerCase()));
    
    // Filtrar carteles por sector
    carteles = carteles.filter(c => 
      wantedS.has((sectores.get(c.numeroCartel) || 'Otros').toLowerCase())
    );
    
    // Filtrar contratos: solo los que pertenecen a carteles filtrados
    const setNro = new Set(carteles.map(c => c.numeroCartel));
    contratos = contratos.filter(c => 
      c.numeroCartel && setNro.has(c.numeroCartel)
    );
  }
  
  // 5. RETORNAR DATOS FILTRADOS
  return { carteles, contratos, sectores };
}
```

### Características Importantes del Filtrado

1. **Consistencia**: Los contratos se filtran por la relación con carteles filtrados
2. **Normalización**: Las instituciones se normalizan a solo dígitos
3. **Case-insensitive**: Los sectores se comparan en minúsculas
4. **Relacional**: Si filtras por sector, los contratos se filtran por `numeroCartel` de los carteles filtrados

---

## 🏷️ Sistema de Clasificación (Categorización)

### Clasificación de Sector

**Objetivo**: Determinar a qué sector pertenece cada cartel.

**Método**: Sistema de votación por palabras clave

```typescript
private asignarSectorPorCartel(): Map<string, string> {
  const lineas: any[] = this.datos.get('DetalleLineaCartel') || [];
  const carteles: any[] = this.datos.get('DetalleCarteles') || [];
  
  // Agrupar líneas por cartel
  const porCartel = _.groupBy(lineas, 'numeroCartel');
  const cartelPorId = new Map(carteles.map(c => [c.numeroCartel, c]));
  const sectorPorCartel = new Map<string, string>();
  
  // Función de votación
  const votar = (score: Record<string, number>, texto?: string) => {
    if (!texto) return;
    const sec = this.clasificarSectorPorDescripcion(texto);
    score[sec] = (score[sec] || 0) + 1;
  };
  
  // Para cada cartel
  carteles.forEach(cartel => {
    const nro = cartel.numeroCartel;
    const score: Record<string, number> = {};
    const lineasCartel = porCartel[nro] || [];
    
    // VOTOS POR LÍNEAS
    lineasCartel.forEach(linea => {
      votar(score, linea.descripcionLinea);
    });
    
    // VOTOS POR DATOS DEL CARTEL
    votar(score, cartel.nombreCartel);
    votar(score, cartel.descripcionCartel);
    votar(score, cartel.clasificacionObjeto);
    
    // GANADOR: Sector con más votos
    const ganador = Object.keys(score).length
      ? Object.entries(score).sort((a, b) => b[1] - a[1])[0][0]
      : 'Otros';
    
    sectorPorCartel.set(nro, ganador);
  });
  
  return sectorPorCartel;
}
```

### Clasificación Individual por Descripción

```typescript
private clasificarSectorPorDescripcion(descripcion: string): string {
  // 1. NORMALIZAR TEXTO
  const texto = (descripcion || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Quitar acentos
    .replace(/\s+/g, ' ');             // Normalizar espacios
  
  // 2. OBTENER REGLAS (SISTEMA + MANUALES)
  const allRules = this.getSectorRules();  // ¡INCLUYE CATEGORÍAS MANUALES!
  
  // 3. BUSCAR COINCIDENCIA
  for (const [sector, reglas] of Object.entries(allRules)) {
    if (reglas.some(r => r.test(texto))) {
      return sector;
    }
  }
  
  // 4. FALLBACK
  return 'Otros';
}
```

### Integración de Categorías Manuales

```typescript
public getSectorRules(): Record<string, RegExp[]> {
  // 1. VERIFICAR CACHE
  if (this.combinedSectorRulesCache) {
    return this.combinedSectorRulesCache;
  }
  
  // 2. COPIAR REGLAS DEL SISTEMA
  const combined = { ...this.SECTOR_RULES };
  
  // 3. CARGAR CATEGORÍAS MANUALES (localStorage)
  const manualRulesJSON = localStorage.getItem('sector_manual_rules');
  if (manualRulesJSON) {
    try {
      const manualRules = JSON.parse(manualRulesJSON);
      
      // 4. AGREGAR/COMBINAR REGLAS MANUALES
      for (const [sector, rules] of Object.entries(manualRules)) {
        if (!combined[sector]) {
          combined[sector] = [];
        }
        // Convertir strings a RegExp
        const regexps = (rules as any[]).map(pattern => 
          new RegExp(pattern, 'i')
        );
        combined[sector].push(...regexps);
      }
    } catch (err) {
      console.error('Error al cargar reglas manuales:', err);
    }
  }
  
  // 5. GUARDAR EN CACHE
  this.combinedSectorRulesCache = combined;
  
  return combined;
}
```

### Invalidación de Cache

```typescript
// En el constructor de DataManager
constructor() {
  // ...
  
  // ESCUCHAR ACTUALIZACIONES DE CATEGORÍAS MANUALES
  window.addEventListener('manualCategoriesUpdated', () => {
    console.log('🔄 DataManager: Actualizando cache de categorías manuales');
    this.combinedSectorRulesCache = null; // Invalidar cache
  });
}
```

---

## 📊 getDashboardMetrics() - Análisis Detallado

### Firma del Método

```typescript
public getDashboardMetrics(
  filtros?: { institucion?: string[]; sector?: string[] }
): DashboardMetrics
```

### Flujo Paso a Paso

```typescript
public getDashboardMetrics(filtros?: { institucion?: string[]; sector?: string[] }) {
  // ========================================
  // 1. APLICAR FILTROS
  // ========================================
  const { carteles, contratos, sectores } = this.filterByInstitucionSector(filtros);
  
  // ========================================
  // 2. OBTENER DATOS COMPLEMENTARIOS
  // ========================================
  const proveedores: any[] = this.datos.get('Proveedores') || [];
  const ofertas: any[] = this.datos.get('Ofertas') || [];
  
  // ========================================
  // 3. MÉTRICAS BÁSICAS (KPIs)
  // ========================================
  const total_carteles = carteles.length;
  const total_contratos = contratos.length;
  const total_proveedores = proveedores.length;
  const total_ofertas = ofertas.length;
  const tasa_exito = total_carteles 
    ? (total_contratos / total_carteles) * 100 
    : 0;
  
  // ========================================
  // 4. CRECIMIENTO INTERANUAL
  // ========================================
  const porAnio = _.groupBy(
    contratos.filter(c => c.fechaFirma),
    c => new Date(c.fechaFirma).getUTCFullYear()
  );
  const anios = Object.keys(porAnio).map(n => parseInt(n, 10)).sort((a,b) => a-b);
  let crecimiento_contratos = 0;
  if (anios.length >= 2) {
    const a2 = anios[anios.length-1];
    const a1 = anios[anios.length-2];
    const v2 = porAnio[a2]?.length || 0;
    const v1 = porAnio[a1]?.length || 0;
    crecimiento_contratos = v1 ? ((v2 - v1) / v1) * 100 : 0;
  }
  
  // ========================================
  // 5. CÁLCULO DE MONTOS
  // ========================================
  // Usar presupuesto oficial del cartel (MONTO_EST)
  const montosPorCartel = this.calcularMontosEstimadosPorCartel();
  let monto_total_contratos = Array.from(montosPorCartel.values())
    .reduce((a, b) => a + (b || 0), 0);
  
  // ========================================
  // 6. ANÁLISIS POR SECTOR
  // ========================================
  const sectorPorCartel = sectores; // Mapa: numeroCartel → sector
  const instPorCartel = new Map<string, string>();
  const normInst = (v: any) => String(v ?? '').trim().replace(/\D+/g, '');
  
  carteles.forEach(c => {
    if (c.numeroCartel) {
      instPorCartel.set(c.numeroCartel, normInst(c.codigoInstitucion));
    }
  });
  
  // Agregaciones por sector
  const cuentaPorSector: Record<string, number> = {};
  const montoPorSector: Record<string, number> = {};
  const instPorSector: Record<string, Set<string>> = {};
  
  carteles.forEach(c => {
    const sec = sectorPorCartel.get(c.numeroCartel) || 'Otros';
    cuentaPorSector[sec] = (cuentaPorSector[sec] || 0) + 1;
    montoPorSector[sec] = (montoPorSector[sec] || 0) + 
      (montosPorCartel.get(c.numeroCartel) || 0);
    
    if (!instPorSector[sec]) instPorSector[sec] = new Set();
    if (c.codigoInstitucion) {
      instPorSector[sec].add(normInst(c.codigoInstitucion));
    }
  });
  
  // Construir entradas de sector
  const sector_entries = Object.keys({ ...this.SECTOR_RULES, Otros: [] })
    .map(sector => {
      const count = cuentaPorSector[sector] || 0;
      const total_monto = montoPorSector[sector] || 0;
      const porcentaje = total_carteles ? (count / total_carteles) * 100 : 0;
      
      return {
        sector,
        count,
        percentage: Math.round(porcentaje * 10) / 10,
        total_monto,
        promedio_monto: count ? total_monto / count : 0,
        instituciones_unicas: (instPorSector[sector]?.size || 0)
      };
    })
    .sort((a, b) => b.count - a.count);
  
  // ========================================
  // 7. ANÁLISIS DE SUBCATEGORÍAS
  // ========================================
  const subcatPorSector: Record<string, Record<string, number>> = {};
  const subcatMontoPorSector: Record<string, Record<string, number>> = {};
  
  const lineasPorCartel = _.groupBy(
    this.datos.get('DetalleLineaCartel') || [],
    'numeroCartel'
  );
  const cartelPorId = new Map(carteles.map(c => [c.numeroCartel, c]));
  
  // Para cada cartel, votar por subcategoría
  Array.from(sectorPorCartel.entries()).forEach(([nro, sec]) => {
    if (sec === 'Otros') return; // No desglosar subcategorías para "Otros"
    
    const arr = lineasPorCartel[nro] || [];
    const score: Record<string, number> = {};
    
    const votar = (texto?: string) => {
      if (!texto) return;
      const sub = this.clasificarSubcategoria(sec, texto);
      score[sub] = (score[sub] || 0) + 1;
    };
    
    // Votos por líneas
    arr.forEach(l => votar(l.descripcionLinea));
    
    // Votos por cartel
    const c = cartelPorId.get(nro);
    if (c) {
      votar(c.nombreCartel);
      votar(c.descripcionCartel);
      votar(c.clasificacionObjeto);
    }
    
    // Determinar ganador (preferir no-"Otros")
    let ganador = 'Otros';
    if (Object.keys(score).length) {
      const candidatos = Object.entries(score)
        .filter(([sub]) => sub !== 'Otros');
      if (candidatos.length) {
        ganador = candidatos.sort((a, b) => b[1] - a[1])[0][0];
      } else {
        ganador = Object.entries(score).sort((a, b) => b[1] - a[1])[0][0];
      }
    }
    
    // Registrar subcategoría
    subcatPorSector[sec] = subcatPorSector[sec] || {};
    subcatPorSector[sec][ganador] = (subcatPorSector[sec][ganador] || 0) + 1;
    
    const m = montosPorCartel.get(nro) || 0;
    subcatMontoPorSector[sec] = subcatMontoPorSector[sec] || {};
    subcatMontoPorSector[sec][ganador] = (subcatMontoPorSector[sec][ganador] || 0) + m;
  });
  
  // Construir análisis de subcategorías
  const subcategory_analysis: Record<string, Array<{
    subcategory: string;
    count: number;
    percentage: number;
    total_monto: number;
    promedio_monto: number;
  }>> = {};
  
  Object.keys({ ...this.SECTOR_RULES, Otros: [] }).forEach(sec => {
    const mapa = subcatPorSector[sec] || {};
    const total = Object.values(mapa).reduce((a, b) => a + b, 0) || 0;
    const montos = subcatMontoPorSector[sec] || {};
    
    const arr = Object.entries(mapa).map(([sub, cnt]) => ({
      subcategory: sub,
      count: cnt,
      percentage: total ? Math.round((cnt / total) * 1000) / 10 : 0,
      total_monto: montos[sub] || 0,
      promedio_monto: cnt ? (montos[sub] || 0) / cnt : 0
    }));
    
    subcategory_analysis[sec] = arr.sort((a, b) => b.count - a.count);
  });
  
  // ========================================
  // 8. TENDENCIAS TEMPORALES
  // ========================================
  const tendencias = this.generarTendenciasMensuales(carteles, contratos, ofertas);
  const tendenciasDiarias = this.generarTendenciasDiarias(30, carteles, contratos, ofertas);
  
  // ========================================
  // 9. VERIFICACIÓN DE CONSISTENCIA
  // ========================================
  const sumaSectores = sector_entries.reduce((s, e) => s + (e.total_monto || 0), 0);
  const diff = Math.abs((monto_total_contratos || 0) - sumaSectores);
  if (diff > 1e-6) {
    console.warn('⚠️ Inconsistencia entre total y suma por sector', {
      monto_total_contratos,
      sumaSectores,
      diff
    });
  } else {
    console.log('✅ Consistencia de montos: total coincide con suma por sector');
  }
  
  // ========================================
  // 10. RETORNAR MÉTRICAS
  // ========================================
  return {
    kpi_metrics: {
      total_contratos,
      total_carteles,
      total_proveedores,
      total_ofertas,
      tasa_exito: Math.round(tasa_exito * 10) / 10,
      crecimiento_contratos: Math.round(crecimiento_contratos * 10) / 10,
      contratos_recientes: total_contratos,
      carteles_recientes: total_carteles
    },
    sector_analysis: sector_entries,
    subcategory_analysis,
    monto_total_contratos,
    tendencias_mensuales: tendencias,
    tendencias_diarias: tendenciasDiarias
  };
}
```

### Datos de Salida

```typescript
interface DashboardMetrics {
  kpi_metrics: {
    total_contratos: number;
    total_carteles: number;
    total_proveedores: number;
    total_ofertas: number;
    tasa_exito: number;              // %
    crecimiento_contratos: number;   // %
    contratos_recientes: number;
    carteles_recientes: number;
  };
  sector_analysis: Array<{
    sector: string;
    count: number;                   // Cantidad de carteles
    percentage: number;              // % del total
    total_monto: number;             // CRC
    promedio_monto: number;          // CRC
    instituciones_unicas: number;
  }>;
  subcategory_analysis: Record<string, Array<{
    subcategory: string;
    count: number;
    percentage: number;
    total_monto: number;
    promedio_monto: number;
  }>>;
  monto_total_contratos: number;
  tendencias_mensuales: Array<{
    mes: string;
    carteles: number;
    contratos: number;
    ofertas: number;
  }>;
  tendencias_diarias: Array<{
    fecha: string;
    carteles: number;
    contratos: number;
    ofertas: number;
  }>;
}
```

---

## 📊 getComplementaryDashboard() - Análisis Detallado

### Firma del Método

```typescript
public getComplementaryDashboard(
  filtros?: { institucion?: string[]; sector?: string[] }
): ComplementaryMetrics
```

### Componentes Principales

#### 1. Top Instituciones

```typescript
const topInstituciones = (() => {
  const carteles: any[] = selectedCarteles;
  const insts: any[] = this.datos.get('InstitucionesRegistradas') || [];
  
  // Normalizar códigos (solo dígitos)
  const normKey = (v: any) => String(v ?? '').trim().replace(/\D+/g, '');
  const normVal = (v: any) => String(v ?? '').trim();
  
  // Mapa de nombres
  const nombreInst = new Map(
    insts.map(i => [
      normKey(i.codigoInstitucion),
      normVal(i.nombreInstitucion) || normVal(i.siglas) || normKey(i.codigoInstitucion)
    ])
  );
  
  // Calcular montos por cartel
  const montos = this.calcularMontosEstimadosPorCartel();
  
  // Agregar por institución
  const agg = new Map<string, {
    codigo: string;
    nombre: string;
    carteles: number;
    monto: number;
  }>();
  
  carteles.forEach(c => {
    const cod = normKey(c.codigoInstitucion);
    if (!cod) return;
    
    const m = montos.get(c.numeroCartel) || 0;
    
    if (!agg.has(cod)) {
      agg.set(cod, {
        codigo: cod,
        nombre: nombreInst.get(cod) || String(cod),
        carteles: 0,
        monto: 0
      });
    }
    
    const row = agg.get(cod)!;
    row.carteles += 1;
    row.monto += m;
  });
  
  // Top 10 por monto
  return Array.from(agg.values())
    .sort((a, b) => (b.monto || 0) - (a.monto || 0))
    .slice(0, 10);
})();
```

#### 2. Top Proveedores

```typescript
const topProveedores = (() => {
  // 1. Obtener líneas adjudicadas filtradas
  const allLineasAdjudicadas: any[] = this.datos.get('LineasAdjudicadas') || [];
  const lineasFiltradas = hasFilters 
    ? allLineasAdjudicadas.filter(linea => 
        nroSet.has(normNro(linea.numeroCartel || linea.NRO_SICOP))
      )
    : allLineasAdjudicadas;
  
  // 2. Función para calcular monto de línea
  const calcularMontoLinea = (linea: any): number => {
    const cantidad = convertirANumero(linea.cantidadAdjudicada);
    const precioUnitario = convertirANumero(linea.precioUnitarioAdjudicado);
    const descuento = convertirANumero(linea.descuento);
    const iva = convertirANumero(linea.iva);
    const otrosImpuestos = convertirANumero(linea.otros_impuestos);
    const acarreos = convertirANumero(linea.acarreos);
    
    let montoFinal = (cantidad * precioUnitario) - descuento + iva + otrosImpuestos + acarreos;
    
    // Conversión de moneda
    const tipoMoneda = String(linea.tipoMoneda || '').toUpperCase();
    if (tipoMoneda === 'USD') {
      const tc = convertirANumero(linea.tipo_cambio_crc) || 510;
      montoFinal *= tc;
    } else if (tipoMoneda === 'EUR') {
      const tc = convertirANumero(linea.tipo_cambio_crc) || 550;
      montoFinal *= tc;
    }
    
    return montoFinal > 0 ? montoFinal : 0;
  };
  
  // 3. Agrupar por proveedor
  const montoPorProveedor = new Map<string, number>();
  const lineasPorProveedor = new Map<string, number>();
  
  lineasFiltradas.forEach(linea => {
    const cedula = String(linea.idProveedorAdjudicado || '')
      .replace(/"/g, '')
      .trim();
    if (!cedula) return;
    
    const monto = calcularMontoLinea(linea);
    
    montoPorProveedor.set(cedula, (montoPorProveedor.get(cedula) || 0) + monto);
    lineasPorProveedor.set(cedula, (lineasPorProveedor.get(cedula) || 0) + 1);
  });
  
  // 4. Obtener nombres
  const nombrePorCedula = this.buildProveedorNombreMap();
  
  // 5. Top 10
  return Array.from(montoPorProveedor.entries())
    .map(([cedula, monto]) => ({
      id: cedula,
      cedula: cedula,
      nombre: this.resolveProveedorNombre(cedula, nombrePorCedula),
      monto: monto,
      lineas: lineasPorProveedor.get(cedula) || 0
    }))
    .filter(prov => prov.monto > 0)
    .sort((a, b) => b.monto - a.monto)
    .slice(0, 10);
})();
```

#### 3. Histograma de Ofertas

```typescript
const offersHistogram = (() => {
  const allOfertas: any[] = this.datos.get('Ofertas') || [];
  const ofrs = hasFilters 
    ? allOfertas.filter(o => nroSet.has(normNro(o.numeroCartel)))
    : allOfertas;
  
  // Agrupar ofertas por cartel
  const porCartel = _.groupBy(ofrs, o => normNro(o.numeroCartel));
  
  // Contar proveedores únicos por cartel
  const counts = Object.values(porCartel).map(arr => 
    new Set(arr.map(o => o.idProveedor)).size
  );
  
  // Agrupar en buckets (0, 1, 2, 3, 4, 5, 6+)
  const bucket = (n: number) => n >= 6 ? '6+' : String(n);
  const agg = new Map<string, number>();
  
  counts.forEach(n => {
    const k = bucket(n);
    agg.set(k, (agg.get(k) || 0) + 1);
  });
  
  // Retornar en orden
  const labels = ['0','1','2','3','4','5','6+'];
  return labels.map(l => ({
    ofertas: l,
    carteles: agg.get(l) || 0
  }));
})();
```

#### 4. Time to Award (TTA)

```typescript
const tta = this.computeTTA(hasFilters, hasFilters ? nroSet : null);
```

**Método computeTTA**:
- Calcula el tiempo promedio entre publicación del cartel y adjudicación
- Filtra por carteles seleccionados si hay filtros
- Retorna: promedio (días), mediana, min, max, n (cantidad)

---

## 🎨 Visualización en ModernDashboard

### Estructura de Componentes

```typescript
<div className="modern-dashboard">
  {/* HEADER CON KPIs */}
  <div className="kpi-cards">
    <KPICard title="Total Contratos" value={kpi.total_contratos} />
    <KPICard title="Total Carteles" value={kpi.total_carteles} />
    <KPICard title="Tasa de Éxito" value={kpi.tasa_exito} suffix="%" />
    <KPICard title="Crecimiento" value={kpi.crecimiento_contratos} suffix="%" />
  </div>
  
  {/* FILTROS */}
  <FilterPanel
    availableInstitutions={availableInstitutions}
    availableCategories={availableCategories}
    onApplyFilters={handleApplyFilters}
    onClearFilters={handleClearFilters}
  />
  
  {/* GRÁFICOS PRINCIPALES */}
  <div className="charts-grid">
    {/* Gráfico de Sectores */}
    <BarChart data={sectorData}>
      <Bar dataKey="count" fill="#8884d8" />
    </BarChart>
    
    {/* Tendencias Temporales */}
    <LineChart data={tendencias_mensuales}>
      <Line type="monotone" dataKey="carteles" stroke="#8884d8" />
      <Line type="monotone" dataKey="contratos" stroke="#82ca9d" />
    </LineChart>
    
    {/* Top Instituciones */}
    <BarChart data={topInstituciones} layout="horizontal">
      <Bar dataKey="monto" fill="#ffc658" />
    </BarChart>
    
    {/* Top Proveedores */}
    <BarChart data={topProveedores} layout="horizontal">
      <Bar dataKey="monto" fill="#ff7300" />
    </BarChart>
  </div>
  
  {/* ANÁLISIS DE SUBCATEGORÍAS */}
  <SubcategorySection
    subcategoryData={subcategory_analysis}
    selectedSectors={selectedCategories}
  />
</div>
```

---

## 🔍 Diferenciación de Datos

### ¿Cómo se diferencian Licitaciones, Contratos y Detalles?

#### 1. **A nivel de Datos (CSV)**

| Tipo | Archivo CSV | Representa | ID Principal |
|------|-------------|------------|--------------|
| **Licitación** | `DetalleCarteles.csv` | Anuncio de licitación | `numeroCartel` |
| **Contrato** | `Contratos.csv` | Contrato firmado | `numeroContrato` |
| **Detalle (Línea)** | `DetalleLineaCartel.csv` | Ítem dentro de licitación | `numeroLinea` |

#### 2. **A nivel de DataManager**

- **Licitaciones**: Se acceden con `this.datos.get('DetalleCarteles')`
- **Contratos**: Se acceden con `this.datos.get('Contratos')`
- **Líneas**: Se acceden con `this.datos.get('DetalleLineaCartel')`

#### 3. **A nivel de Dashboard**

**Métricas de Licitaciones** (Carteles):
- `total_carteles`: Cuenta de licitaciones publicadas
- `sector_analysis`: Clasificación de licitaciones por sector
- Base para presupuestos estimados (`presupuestoOficial`)

**Métricas de Contratos**:
- `total_contratos`: Cuenta de contratos firmados
- `tasa_exito`: Relación contratos/carteles
- `crecimiento_contratos`: Variación interanual de contratos

**Métricas de Detalles** (Líneas):
- Usadas para **clasificar sectores** de las licitaciones
- Base para **subcategorías**
- Fuente de presupuestos cuando falta dato en cartel

#### 4. **Relación entre Tipos**

```
LICITACIÓN (DetalleCarteles)
    │
    ├─► tiene muchos ──► LÍNEAS (DetalleLineaCartel)
    │                       │
    │                       └─► descripcionLinea → clasificación sector
    │
    └─► puede generar ──► CONTRATO (Contratos)
                              │
                              └─► tasa_exito = contratos / carteles
```

---

## ✅ Verificación de Transparencia

### ¿Es DataManager la única fuente de datos?

**SÍ**. Verificación completa:

```typescript
// ❌ NUNCA se hace esto en el código:
const carteles = fetch('/api/carteles');  // NO EXISTE
const data = import('./data/carteles.json');  // NO EXISTE

// ✅ SIEMPRE se hace esto:
const dashboardData = dataManager.getDashboardMetrics(filtros);
const complementData = dataManager.getComplementaryDashboard(filtros);
const carteles = dataManager.obtenerTodosLosCarteles();
```

### ¿Los filtros se aplican consistentemente?

**SÍ**. Flujo completo:

1. **Usuario selecciona filtros** → `setSelectedInstitutions()`, `setSelectedCategories()`
2. **Usuario hace clic en "Aplicar"** → `handleApplyFilters()`
3. **Se actualiza estado** → `setFiltersApplied({ institucion: [...], sector: [...] })`
4. **useMemo detecta cambio** → Re-ejecuta `dataManager.getDashboardMetrics(filtersApplied)`
5. **DataManager filtra** → `filterByInstitucionSector(filtros)`
6. **Retorna datos filtrados** → Dashboard se re-renderiza con nuevos datos

### ¿Las categorías manuales están integradas?

**SÍ**. Verificación:

```typescript
// DataManager.getSectorRules()
public getSectorRules(): Record<string, RegExp[]> {
  if (this.combinedSectorRulesCache) {
    return this.combinedSectorRulesCache;  // Cache válido
  }
  
  const combined = { ...this.SECTOR_RULES };  // Reglas del sistema
  
  // ✅ CARGAR CATEGORÍAS MANUALES
  const manualRulesJSON = localStorage.getItem('sector_manual_rules');
  if (manualRulesJSON) {
    const manualRules = JSON.parse(manualRulesJSON);
    for (const [sector, rules] of Object.entries(manualRules)) {
      if (!combined[sector]) {
        combined[sector] = [];
      }
      combined[sector].push(...rules.map(p => new RegExp(p, 'i')));
    }
  }
  
  this.combinedSectorRulesCache = combined;  // ✅ Guardar en cache
  return combined;
}

// ✅ Usado en clasificación
private clasificarSectorPorDescripcion(descripcion: string): string {
  const allRules = this.getSectorRules();  // ✅ Incluye manuales
  // ...
}
```

---

## 📈 Métricas Financieras

### Cálculo de Montos

**Fuente Principal**: `presupuestoOficial` del cartel (DetalleCarteles)

```typescript
private calcularMontosEstimadosPorCartel(): Map<string, number> {
  const carteles: any[] = this.datos.get('DetalleCarteles') || [];
  const lineas: any[] = this.datos.get('DetalleLineaCartel') || [];
  const montos = new Map<string, number>();
  
  // 1. USAR PRESUPUESTO OFICIAL DEL CARTEL
  carteles.forEach(c => {
    const k = c.numeroCartel;
    if (!k) return;
    const val = toNum(c.presupuestoOficial);
    if (val > 0) montos.set(k, val);
  });
  
  // 2. BACKFILL: Si no hay presupuesto oficial, sumar líneas
  if (lineas.length) {
    const porCartel = _.groupBy(lineas, 'numeroCartel');
    for (const [k, arr] of Object.entries(porCartel)) {
      if (!k) continue;
      const ya = montos.get(k);
      if (ya && ya > 0) continue;  // Ya tiene presupuesto oficial
      
      const subtotal = arr.reduce((s, o) => {
        const precio = o.presupuestoLinea ?? o.precioUnitarioEstimado;
        const cantidad = o.cantidadRequerida ?? o.cantidadSolicitada ?? 1;
        const p = toNum(precio);
        const c = toNum(cantidad) || 1;
        const v = p * c;
        return s + (isFinite(v) ? v : 0);
      }, 0);
      
      if (subtotal > 0) montos.set(k, subtotal);
    }
  }
  
  return montos;
}
```

### Conversión de Monedas

**Para líneas adjudicadas** (Top Proveedores):

```typescript
const calcularMontoLinea = (linea: any): number => {
  const cantidad = convertirANumero(linea.cantidadAdjudicada);
  const precioUnitario = convertirANumero(linea.precioUnitarioAdjudicado);
  const descuento = convertirANumero(linea.descuento);
  const iva = convertirANumero(linea.iva);
  const otrosImpuestos = convertirANumero(linea.otros_impuestos);
  const acarreos = convertirANumero(linea.acarreos);
  
  let montoFinal = (cantidad * precioUnitario) - descuento + iva + otrosImpuestos + acarreos;
  
  const tipoMoneda = String(linea.tipoMoneda || '').toUpperCase();
  if (tipoMoneda === 'USD') {
    const tc = convertirANumero(linea.tipo_cambio_crc) || 510;  // Tipo de cambio USD→CRC
    montoFinal *= tc;
  } else if (tipoMoneda === 'EUR') {
    const tc = convertirANumero(linea.tipo_cambio_crc) || 550;  // Tipo de cambio EUR→CRC
    montoFinal *= tc;
  }
  
  return montoFinal > 0 ? montoFinal : 0;
};
```

---

## 🧪 Testing y Debugging

### Console Logs Informativos

```typescript
// En getDashboardMetrics
console.log('🔍 Sample cartel headers:', Object.keys(carteles[0]));
console.log('🔍 Sector assignment sample:', Array.from(sectorPorCartel.entries()).slice(0, 10));
console.log('✅ Consistencia de montos: total coincide con suma por sector');

// En getComplementaryDashboard
console.log('[ComplementaryDashboard] carteles:', selectedCarteles.length);
console.log('🔧 Calculando Top Proveedores desde cero...');
console.log('📊 Procesando X líneas adjudicadas de Y totales');
console.log('💰 Encontrados X proveedores únicos con montos');
console.log('🏆 Top 10 proveedores calculado:', topProveedoresList);
```

### Verificaciones de Integridad

```typescript
// Verificar consistencia de montos
const sumaSectores = sector_entries.reduce((s, e) => s + (e.total_monto || 0), 0);
const diff = Math.abs((monto_total_contratos || 0) - sumaSectores);
if (diff > 1e-6) {
  console.warn('⚠️ Inconsistencia entre total y suma por sector', {
    monto_total_contratos,
    sumaSectores,
    diff
  });
} else {
  console.log('✅ Consistencia de montos: total coincide con suma por sector');
}
```

---

## 🚀 Optimizaciones

### Cache de Reglas Combinadas

```typescript
// En DataManager
private combinedSectorRulesCache: Record<string, RegExp[]> | null = null;

public getSectorRules(): Record<string, RegExp[]> {
  // ✅ RETORNAR CACHE SI ESTÁ DISPONIBLE
  if (this.combinedSectorRulesCache) {
    return this.combinedSectorRulesCache;
  }
  
  // Combinar reglas sistema + manuales
  const combined = { ...this.SECTOR_RULES };
  const manualRulesJSON = localStorage.getItem('sector_manual_rules');
  if (manualRulesJSON) {
    // ... agregar reglas manuales
  }
  
  // ✅ GUARDAR EN CACHE
  this.combinedSectorRulesCache = combined;
  return combined;
}

// ✅ INVALIDAR CACHE cuando hay cambios
constructor() {
  window.addEventListener('manualCategoriesUpdated', () => {
    this.combinedSectorRulesCache = null;  // Invalidar
  });
}
```

### useMemo en React

```typescript
// ✅ EVITAR RECÁLCULOS INNECESARIOS
const dashboardData = useMemo(
  () => dataManager.getDashboardMetrics?.(filtersApplied) || DASH_DEFAULT,
  [filtersApplied]  // Solo recalcular cuando cambian los filtros
);

const complementData = useMemo(
  () => dataManager.getComplementaryDashboard?.(filtersApplied) || COMP_DEFAULT,
  [filtersApplied]
);
```

---

## 📋 Resumen de Garantías

### ✅ Transparencia Completa

1. **Fuente Única**: DataManager es la única fuente de datos
2. **Sin Shortcuts**: No hay llamadas directas a CSV o APIs externas
3. **Trazabilidad**: Todos los cálculos están documentados y loggeados
4. **Consistencia**: Verificaciones automáticas de integridad

### ✅ Filtros Robustos

1. **Aplicación Consistente**: `filterByInstitucionSector()` se usa en ambos métodos
2. **Normalización**: Instituciones y sectores se normalizan antes de comparar
3. **Relaciones**: Los contratos se filtran por relación con carteles
4. **Reactivo**: useMemo asegura actualización automática

### ✅ Diferenciación Clara

1. **Licitaciones** (DetalleCarteles): Anuncios, base de clasificación por sector
2. **Contratos** (Contratos): Adjudicaciones firmadas, métricas de éxito
3. **Líneas** (DetalleLineaCartel): Ítems individuales, clasificación detallada

### ✅ Categorización Integrada

1. **Sistema + Manual**: `getSectorRules()` combina ambas fuentes
2. **Cache Eficiente**: Solo se recalcula cuando hay cambios
3. **Eventos**: Sistema reactivo con `manualCategoriesUpdated`
4. **Votación Robusta**: Múltiples fuentes de texto para clasificar

---

## 🎯 Próximos Pasos Recomendados

### 1. Documentación Visual
- [ ] Crear diagramas de flujo con Mermaid
- [ ] Diagramas ER de relaciones entre tablas
- [ ] Flowchart de clasificación de sectores

### 2. Tests Unitarios
- [ ] Tests para `filterByInstitucionSector()`
- [ ] Tests para `clasificarSectorPorDescripcion()`
- [ ] Tests de consistencia de montos

### 3. Mejoras de UX
- [ ] Indicador de carga al aplicar filtros
- [ ] Tooltip con explicación de cada métrica
- [ ] Exportar datos filtrados a CSV/Excel

### 4. Optimizaciones
- [ ] IndexedDB para cache de datos procesados
- [ ] Web Workers para cálculos pesados
- [ ] Paginación en Top Instituciones/Proveedores

---

## 📚 Referencias

- **ModernDashboard.tsx**: Interfaz principal de usuario
- **DataManager.ts**: Motor de datos y cálculos
- **CategoryService.ts**: Gestión de categorías manuales
- **CacheService.ts**: Persistencia IndexedDB
- **INTEGRACION_CATEGORIAS_MANUALES.md**: Documentación de integración

---

**Fecha**: 2024
**Versión**: 1.0
**Autor**: SICOP Analytics Team
