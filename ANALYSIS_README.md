# Clasificación de sectores (SICOP Analytics)

Este proyecto clasifica automáticamente cada cartel en un sector con base en patrones de texto encontrados en el nombre, descripción del cartel y descripciones de líneas.

## Categorías

Se utilizan 12 categorías principales, más una categoría de respaldo "Otros":

- Mantenimiento, reparación y limpieza
- Suministros de oficina y papelería
- Tecnología y sistemas
- Vehículos, transporte y repuestos
- Salud, medicina y laboratorio
- Seguridad y vigilancia
- Construcción y materiales de obra
- Alimentos y servicios de catering
- Servicios profesionales y consultoría
- Educación, cultura y recreación
- Logística y servicios generales
- Herramientas industriales y electrodomésticos
- Otros (fallback)

Los patrones que definen cada categoría se encuentran en `src/data/DataManager.ts` dentro de la constante `SECTOR_RULES`. Cada categoría consta de un arreglo de expresiones regulares evaluadas con flags `iu` para búsqueda insensible a mayúsculas y con soporte a variantes de acentos.

## Cómo funciona

1. Para cada cartel, se recolectan textos de referencia (descripciones de líneas, nombre del cartel, descripción del cartel y clasificación de objeto).
2. Se evalúan todas las categorías en el orden definido en `SECTOR_RULES`. La primera categoría con alguna coincidencia asigna el sector del cartel.
3. Si no hay coincidencias, el sector por defecto es `Otros`.

## Mantenimiento de patrones

- Para agregar o ajustar patrones, edite `SECTOR_RULES` en `src/data/DataManager.ts`.
- Mantenga las expresiones concisas, usando variantes de acento cuando sea pertinente (p.ej. `(i|í)`).
- Revise periódicamente los carteles clasificados como `Otros` para identificar nuevos patrones.

## UI

El dashboard consume la lista de sectores calculada y genera dinámicamente las opciones del selector. Los colores asociados a las categorías están definidos en `src/components/ModernDashboard.tsx`.

## Subcategorías por sector

- Se añadieron reglas detonantes por subcategoría en `src/data/DataManager.ts` bajo `SUBCATEGORY_RULES`.
- La subcategoría se asigna por cartel, votando por coincidencias de descripciones de líneas dentro del sector ya asignado.
- Términos generales se agrupan en la subcategoría `Otros`.
- `getDashboardMetrics` ahora expone `subcategory_analysis` como mapa `sector -> array de métricas`.
- `ModernDashboard` muestra un gráfico de pastel de subcategorías al lado del de sectores, y al hacer clic en un sector se actualiza el gráfico de subcategorías.

