// ================================
// TIPOS PARA GESTIÓN DE CATEGORÍAS MANUALES
// ================================

export interface SubcategoryRule {
  id: string;
  nombre: string;
  palabrasClave: string[]; // keywords para matching
  activa: boolean;
}

export interface ManualCategoryRule {
  id: string;
  nombre: string;
  descripcion?: string;
  palabrasClave: string[]; // keywords para matching de líneas/carteles
  instituciones?: string[]; // códigos de instituciones seleccionadas
  activo: boolean;
  color?: string; // para UI
  subcategorias?: SubcategoryRule[]; // subcategorías de esta categoría
}

export interface CategoryGroup {
  id: string;
  nombre: string;
  descripcion?: string;
  categorias: string[]; // ids de ManualCategoryRule
}

export interface CategorySuggestion {
  lineaId?: string; // opcional si se derivan de una línea
  numeroCartel: string;
  texto: string; // nombreCartel/descripcionLinea
  score: number; // 0-1
  coincidencias: string[]; // keywords que matchearon
}

// ================================
// TIPOS PARA CONFIGURACIÓN DE CATEGORÍAS
// ================================

export interface CategoryConfigEntry {
  id: string; // nombre de la categoría (ej: "Tecnología y sistemas")
  nombre: string; // nombre legible
  tipo: 'sistema' | 'manual'; // categoría del sistema o creada por usuario
  activa: boolean; // si está activa o desactivada
  palabrasClave?: string[]; // solo para manuales
  descripcion?: string; // descripción opcional
  color?: string; // color para UI
  subcategorias?: SubcategoryRule[]; // subcategorías
}

export interface CategoryConfiguration {
  version: string; // para versionado de configuración
  categorias: Record<string, boolean>; // id -> activa/inactiva
  lastModified: string; // timestamp ISO
}

// ================================
// TIPOS PARA OVERRIDE DE SUBCATEGORÍAS DEL SISTEMA
// ================================

export interface SystemSubcategoryOverride {
  categoriaId: string; // nombre de la categoría del sistema
  subcategorias: SubcategoryRule[]; // subcategorías adicionales o modificadas
}

export interface SubcategoryConfiguration {
  version: string;
  overrides: Record<string, SubcategoryRule[]>; // categoriaId -> subcategorías
  lastModified: string;
}
