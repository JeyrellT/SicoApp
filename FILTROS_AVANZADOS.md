# Filtros Avanzados SICOP - Documentación

## 🎯 Descripción General

Los filtros avanzados de SICOP proporcionan una interfaz moderna e interactiva para filtrar datos de licitaciones por **institución** y **categoría/sector**. El sistema incluye búsqueda en tiempo real, selección múltiple, y indicadores visuales de progreso.

## ✨ Características Principales

### 🔍 Búsqueda Inteligente
- **Búsqueda en tiempo real** con debounce (300ms)
- **Filtrado dinámico** por nombre, código o descripción
- **Indicadores visuales** de estado de búsqueda
- **Contadores de resultados** y elementos disponibles

### 🎨 Interfaz Moderna
- **Diseño glassmorphism** con efectos de transparencia
- **Animaciones suaves** y transiciones
- **Estados visuales** claros (carga, selección, hover)
- **Responsive design** adaptable a diferentes pantallas

### 🚀 Rendimiento Optimizado
- **Debounce** para evitar búsquedas excesivas
- **Memoización** de resultados filtrados
- **Lazy loading** de opciones grandes
- **Caching** inteligente de datos

## 🛠️ Componentes Técnicos

### 1. `AdvancedFilters` (Componente Principal)
```tsx
interface AdvancedFiltersProps {
  institutions: FilterOption[];
  categories: FilterOption[];
  selectedInstitutions: string[];
  selectedCategories: string[];
  onInstitutionsChange: (institutions: string[]) => void;
  onCategoriesChange: (categories: string[]) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  isLoading?: boolean;
}
```

### 2. `AdvancedMultiSelect` (Selector Múltiple)
- Dropdown con búsqueda integrada
- Selección múltiple con checkboxes visuales
- Acciones rápidas (seleccionar todos, limpiar)
- Contadores y estadísticas en tiempo real

### 3. Hooks Personalizados
- `useDebounce`: Optimización de búsquedas
- `useInstitutionSearch`: Búsqueda específica de instituciones
- `useCategorySearch`: Búsqueda específica de categorías
- `useFilterStats`: Estadísticas de filtros aplicados

## 📊 Integración con DataManager

### Nuevos Métodos Añadidos

#### `getAvailableInstitutions()`
Retorna lista de instituciones con:
- ID y código de institución
- Nombre completo y siglas
- Contador de licitaciones por institución
- Ordenamiento por relevancia

#### `getAvailableCategories()`
Retorna lista de categorías/sectores con:
- Nombre formateado del sector
- Contador de licitaciones por categoría
- Clasificación automática basada en reglas

#### `searchInstitutions(searchTerm, limit)`
Búsqueda optimizada de instituciones:
- Filtrado por nombre, código o siglas
- Límite configurable de resultados
- Ordenamiento por relevancia

#### `searchCategories(searchTerm, limit)`
Búsqueda optimizada de categorías:
- Filtrado por nombre de sector
- Límite configurable de resultados
- Ordenamiento por frecuencia

#### `getFilterStats(filters)`
Estadísticas de filtros aplicados:
- Total de registros vs. filtrados
- Porcentaje de reducción
- Contadores de filtros activos

## 🎨 Características de UX/UI

### Estados Visuales
- **Idle**: Estado normal de espera
- **Searching**: Indicador de carga durante búsqueda
- **Selected**: Elementos seleccionados destacados
- **Hover**: Efectos de interacción suaves
- **Focus**: Estados de enfoque accesibles

### Indicadores de Estado
- 🔄 **Spinner de carga** durante búsquedas
- ✅ **Badges de selección** con contadores
- 📊 **Estadísticas en vivo** de filtros
- 🎯 **Botones de acción** contextuales

### Accesibilidad
- **Navegación por teclado** completa
- **Screen reader** compatible
- **Alto contraste** en elementos importantes
- **Tooltips informativos** en elementos clave

## 🚀 Casos de Uso

### 1. Búsqueda Rápida de Institución
```
Usuario busca "CCSS" → Sistema muestra:
- Caja Costarricense de Seguro Social (CCSS) - 1,245 licitaciones
- Otras instituciones relacionadas
```

### 2. Filtrado por Múltiples Categorías
```
Usuario selecciona:
- "Tecnología y sistemas"
- "Servicios profesionales"
→ Dashboard se actualiza mostrando solo esas categorías
```

### 3. Análisis Específico
```
Usuario filtra por:
- Institución: Ministerio de Educación
- Categoría: Suministros de oficina
→ Vista especializada del sector educativo
```

## 📈 Beneficios del Sistema

### Para Usuarios Finales
- ⚡ **Búsqueda instantánea** sin latencia
- 🎯 **Filtrado preciso** multi-criterio
- 📊 **Feedback visual** inmediato
- 🔄 **Facilidad de uso** intuitiva

### Para Analistas
- 📈 **Análisis granular** por sector/institución
- 🔍 **Descubrimiento de patrones** específicos
- 📊 **Comparaciones directas** entre entidades
- 💡 **Insights contextualizados** en tiempo real

### Para el Sistema
- 🚀 **Rendimiento optimizado** con debounce
- 💾 **Uso eficiente** de memoria
- 🔄 **Actualización reactiva** de datos
- 📱 **Responsive** en todos los dispositivos

## 🔧 Configuración y Personalización

### Parámetros Configurables
```tsx
const SEARCH_DEBOUNCE_MS = 300;     // Tiempo de debounce
const MAX_RESULTS_LIMIT = 50;       // Límite de resultados
const MAX_DISPLAYED_TAGS = 2;       // Tags mostrados antes de colapsar
const ANIMATION_DURATION = 200;     // Duración de animaciones
```

### Colores Personalizables
```tsx
const INSTITUTION_COLOR = '#3498db';  // Azul para instituciones
const CATEGORY_COLOR = '#e74c3c';     // Rojo para categorías
const SUCCESS_COLOR = '#28a745';      // Verde para éxito
const WARNING_COLOR = '#ffc107';      // Amarillo para advertencias
```

## 🐛 Solución de Problemas

### Problemas Comunes

#### Búsqueda Lenta
- Verificar que el debounce esté activado
- Revisar el límite de resultados
- Comprobar el tamaño del dataset

#### Filtros No Funcionan
- Verificar que `filtersApplied` se actualice
- Comprobar que `DataManager` tenga los métodos nuevos
- Revisar la estructura de datos esperada

#### Elementos No Se Cargan
- Verificar que `isLoaded` sea true
- Comprobar que los datos CSV estén disponibles
- Revisar errores en la consola del navegador

## 🔮 Futuras Mejoras

### Funcionalidades Planeadas
- 🔄 **Filtros guardados** y favoritos
- 📊 **Historial de búsquedas** recientes
- 🎨 **Temas personalizables** de usuario
- 📱 **App móvil** nativa
- 🔐 **Filtros por permisos** de usuario
- 📈 **Analytics de uso** de filtros

### Optimizaciones Técnicas
- 🚀 **Virtualización** para listas grandes
- 💾 **Cache inteligente** con TTL
- 🔄 **Sincronización en tiempo real**
- 📊 **Indexación** de búsquedas frecuentes

---

## 📞 Soporte

Para problemas o sugerencias con los filtros avanzados, consulta:
- 📚 Documentación técnica en `/docs`
- 🐛 Issues en el repositorio
- 💬 Canal de desarrollo en Slack

**Versión**: 2.0.0  
**Última actualización**: Septiembre 2025