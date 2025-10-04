# 🎯 Mejoras al Panel de Prueba de Palabras Clave

## 📋 Resumen de Cambios

Se implementó un sistema completo de búsqueda y análisis de licitaciones por palabras clave con vista expandible que permite ver el detalle completo de cada cartel.

---

## ✨ Nuevas Funcionalidades

### 1. **Vista Agrupada por Cartel**
- Los resultados ahora se agrupan por **cartel** en lugar de mostrar líneas individuales
- Cada cartel muestra:
  - Número de cartel y código de institución
  - Nombre completo del cartel
  - Porcentaje de confianza
  - Cantidad de líneas que tienen coincidencias
  - Monto total del cartel
  - Todas las palabras clave encontradas

### 2. **Priorización Inteligente**
Los carteles se ordenan de forma inteligente:
1. **Primero**: Carteles donde el **nombre** tiene coincidencias directas (marcados con ⭐ "Nombre Coincide")
2. **Segundo**: Carteles donde solo las **líneas** tienen coincidencias
3. Dentro de cada grupo, se ordenan por **score** (porcentaje de confianza)

### 3. **Vista Expandible de Todas las Líneas**
- Botón "Ver todas las líneas del cartel" que muestra **TODAS** las líneas, no solo las que coinciden
- Las líneas que coinciden con las palabras clave están:
  - ✅ **Resaltadas en amarillo** con borde dorado
  - 🏷️ **Marcadas con badge "✓ Coincide"**
  - 📝 **Muestran las palabras clave encontradas**
  - 🎯 **Muestran las fuentes** donde se encontraron (descripción de línea, nombre del cartel, etc.)
- Las líneas sin coincidencias se muestran en gris para contexto completo

### 4. **Búsqueda Exhaustiva en 4 Fuentes**
Para cada línea del cartel, el sistema busca en:
1. **Descripción de la línea** (DetalleLineaCartel)
2. **Nombre del cartel** (nombreCartel)
3. **Descripción del cartel** (descripcionCartel)
4. **Clasificación UNSPSC** (clasificacionObjeto)

### 5. **Indicadores Visuales Mejorados**

#### Badges de Estado:
- 🟢 **Verde con estrella**: Nombre del cartel coincide directamente
- 🔵 **Azul**: Número de cartel
- ⚪ **Gris**: Código de institución
- 🟢/🟡/🟠 **Colores por confianza**: 
  - Verde: ≥80% confianza
  - Amarillo: 60-79% confianza
  - Naranja: <60% confianza
- 🔵 **Índigo**: Cantidad de líneas con coincidencias

#### Colores de Fondo:
- 🟢 **Verde claro**: Cartel con nombre que coincide
- ⚪ **Blanco/Gris**: Cartel normal
- 🟡 **Amarillo**: Línea con coincidencias (en vista expandida)
- ⚪ **Gris claro**: Línea sin coincidencias (en vista expandida)

---

## 🎨 Características de la Vista Expandida

### Información por Línea:
1. **Número de línea** con badge de color
2. **Monto de la línea** (si existe)
3. **Descripción completa** de la línea
4. **Palabras clave encontradas** (solo para líneas con coincidencias)
5. **Fuentes donde se encontraron** las palabras clave con:
   - Nombre de la fuente (ej: "Descripción de línea", "Nombre del cartel")
   - Palabras específicas encontradas
   - Extracto del texto donde se encontró

### Ejemplo Visual:
```
┌─────────────────────────────────────────────────────┐
│ ⭐ NOMBRE COINCIDE  | 2025000308 | 3014042120      │
│ 100% confianza | 6 líneas con coincidencias         │
├─────────────────────────────────────────────────────┤
│ ADQUISICIÓN DE BANDERAS INTERNACIONALES...          │
│ 🔑 Palabras encontradas: ✓ tela                     │
│                                                      │
│ ▶ Ver todas las líneas del cartel (6 líneas)        │
│                                                      │
│ [AL EXPANDIR]                                        │
│ 📋 TODAS LAS LÍNEAS DEL CARTEL                      │
│                                                      │
│ ┌─ Línea 1 ✓ COINCIDE ──────────────────┐          │
│ │ Palabras: ✓ tela                        │          │
│ │ 🎯 Fuentes:                             │          │
│ │   • Nombre del cartel: ✓ tela           │          │
│ │     "ADQUISICIÓN DE BANDERAS..."        │          │
│ └─────────────────────────────────────────┘          │
│                                                      │
│ ┌─ Línea 2 (sin coincidencias) ──────────┐          │
│ │ Descripción: Material adicional...      │          │
│ └─────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────┘
```

---

## 🔍 Algoritmo de Análisis

### Proceso de Búsqueda:
1. **Analizar cada línea** del dataset DetalleLineaCartel
2. Para cada línea, buscar palabras clave en:
   - Su propia descripción
   - El nombre del cartel al que pertenece
   - La descripción del cartel
   - La clasificación UNSPSC del cartel
3. **Registrar todas las fuentes** donde se encontró cada palabra
4. **Calcular el score** = (palabras encontradas / total palabras buscadas)
5. **Agrupar líneas** por cartel
6. **Agregar información** de todas las líneas del cartel (para vista expandida)
7. **Ordenar carteles**:
   - Primero: los que tienen coincidencias en el nombre
   - Segundo: por score descendente

### Normalización de Texto:
- Conversión a minúsculas
- Eliminación de acentos (normalización NFD)
- Trim de espacios

---

## 📊 Estadísticas Mostradas

El panel muestra estadísticas generales:
- **Total de licitaciones encontradas**
- **Monto total** de todas las licitaciones
- **Confianza promedio** del análisis
- **Número de instituciones** involucradas
- **Top palabras clave** más frecuentes

---

## 🎯 Casos de Uso

### Caso 1: Buscar "tela"
**Resultado:**
- Muestra carteles donde el **nombre** incluye "tela" (ej: "Adquisición de tela para exteriores")
- Muestra carteles donde alguna **línea** incluye "tela" aunque el nombre no
- Al expandir, se ven todas las líneas del cartel con las que coinciden resaltadas

### Caso 2: Buscar múltiples palabras: "computadora", "software", "licencia"
**Resultado:**
- Carteles con alta confianza (100%) si tienen las 3 palabras
- Carteles con confianza media (66%) si tienen 2 de 3 palabras
- Carteles con confianza baja (33%) si tienen solo 1 palabra
- Vista expandida muestra dónde se encontró cada palabra

### Caso 3: Crear categoría "Tecnología"
**Proceso:**
1. Agregar palabras clave: "computadora", "software", "tecnología"
2. Analizar licitaciones
3. Revisar resultados y ver cuáles coinciden
4. Expandir carteles interesantes para verificar el contexto
5. Guardar como categoría para clasificación automática

---

## 🚀 Ventajas del Nuevo Sistema

1. ✅ **Contexto Completo**: Ver todas las líneas del cartel, no solo las que coinciden
2. ✅ **Priorización**: Carteles con nombre coincidente aparecen primero
3. ✅ **Transparencia**: Saber exactamente dónde se encontró cada palabra
4. ✅ **Verificación**: Poder verificar líneas que no coincidieron para validar la búsqueda
5. ✅ **Navegación**: Interfaz expandible/contraíble para manejar muchos resultados
6. ✅ **Validación**: Ver el monto y detalles de cada línea individual

---

## 🔧 Detalles Técnicos

### Estado del Componente:
```typescript
const [expandedCarteles, setExpandedCarteles] = useState<Set<string>>(new Set());
```

### Estructura de Datos de Resultados:
```typescript
{
  numeroCartel: string,
  nombreCartel: string,
  codigoInstitucion: string,
  coincidencias: string[],           // Todas las palabras encontradas
  score: number,                     // 0-1
  presupuestoTotal: number,
  cantidadLineasConCoincidencias: number,
  lineasConCoincidencias: [         // Líneas que coincidieron
    {
      numeroLinea: number,
      descripcionLinea: string,
      presupuestoLinea: number,
      coincidencias: string[],
      fuentesConCoincidencias: [    // Dónde se encontraron
        {
          fuente: string,           // "Nombre del cartel", etc.
          texto: string,            // Extracto
          palabras: string[]        // Palabras en esa fuente
        }
      ],
      todasLasLineas: [...]        // TODAS las líneas del cartel
    }
  ],
  nombreTieneCoincidencias: boolean,
  mode: 'exact' | 'fuzzy' | 'semantic'
}
```

---

## 📝 Próximas Mejoras Sugeridas

1. **Filtro de instituciones**: Permitir filtrar resultados por institución
2. **Exportar resultados**: Descargar carteles encontrados como CSV
3. **Búsqueda por rango de fechas**: Limitar búsqueda a períodos específicos
4. **Resaltar palabras**: Marcar las palabras clave en el texto
5. **Comparar categorías**: Ver qué carteles califican para múltiples categorías

---

## 📅 Fecha de Implementación
**Octubre 4, 2025**

## 👨‍💻 Archivos Modificados
- `src/components/CategoryManager/KeywordTestingPanel.tsx`
