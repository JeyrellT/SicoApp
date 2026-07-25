// ================================
// SERVICIO PARA CATEGORÍAS MANUALES Y SUGERENCIAS POR KEYWORDS
// ================================

import { ManualCategoryRule, CategoryGroup, CategoryConfiguration, CategoryConfigEntry, SubcategoryConfiguration } from '../types/categories';

const LS_RULES_KEY = 'sicop.manualCategories.v1';
const LS_GROUPS_KEY = 'sicop.categoryGroups.v1';
const LS_CONFIG_KEY = 'sicop.categoryConfiguration.v1';
const LS_SUBCAT_CONFIG_KEY = 'sicop.subcategoryConfiguration.v1';

class CategoryServiceImpl {

  // ================================
  // MÉTODOS DE PERSISTENCIA (localStorage)
  // ================================
  // Nota: antes existía una copia adicional en IndexedDB (CacheService) para
  // estos mismos datos. Se retiró junto con el resto del sistema de carga
  // manual de archivos; localStorage ya era la fuente de verdad síncrona y
  // cubre por completo esta persistencia.

  /**
   * Carga las categorías desde localStorage
   */
  private async loadRulesFromCache(): Promise<ManualCategoryRule[]> {
    return this.loadRulesFromLocalStorage();
  }

  /**
   * Carga los grupos desde localStorage
   */
  private async loadGroupsFromCache(): Promise<CategoryGroup[]> {
    return this.loadGroupsFromLocalStorage();
  }

  /**
   * Carga la configuración desde localStorage
   */
  private async loadConfigFromCache(): Promise<CategoryConfiguration | null> {
    return this.loadConfigFromLocalStorage();
  }

  /**
   * Carga desde localStorage (método legacy)
   */
  private loadRulesFromLocalStorage(): ManualCategoryRule[] {
    try {
      const raw = localStorage.getItem(LS_RULES_KEY);
      if (!raw) return [];
      const arr: ManualCategoryRule[] = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }

  /**
   * Carga grupos desde localStorage (método legacy)
   */
  private loadGroupsFromLocalStorage(): CategoryGroup[] {
    try {
      const raw = localStorage.getItem(LS_GROUPS_KEY);
      if (!raw) return [];
      const arr: CategoryGroup[] = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }

  /**
   * Carga configuración desde localStorage
   */
  private loadConfigFromLocalStorage(): CategoryConfiguration | null {
    try {
      const raw = localStorage.getItem(LS_CONFIG_KEY);
      if (!raw) return null;
      const config: CategoryConfiguration = JSON.parse(raw);
      return config;
    } catch { return null; }
  }

  // ================================
  // API PÚBLICA
  // ================================

  getAllRules(): ManualCategoryRule[] {
    // Por ahora retornamos sincrónicamente desde localStorage
    // En el futuro podríamos hacer esto async
    return this.loadRulesFromLocalStorage();
  }

  async getAllRulesAsync(): Promise<ManualCategoryRule[]> {
    return await this.loadRulesFromCache();
  }

  saveRules(rules: ManualCategoryRule[]) {
    // Guardar en localStorage (sincrónico)
    localStorage.setItem(LS_RULES_KEY, JSON.stringify(rules));
    
    // Guardar en cache (asíncrono, no bloqueante)
    // Notificar al DataManager que las categorías han cambiado
    // Esto forzará la recarga de sectores en el siguiente render
    this.notifyDataManagerUpdate();
  }
  
  /**
   * Notifica que las categorías manuales han cambiado
   * Esto permite que el DataManager actualice sus reglas en el próximo uso
   */
  private notifyDataManagerUpdate() {
    // Disparar un evento personalizado para notificar el cambio
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('manualCategoriesUpdated'));
    }
  }

  upsertRule(rule: ManualCategoryRule) {
    const all = this.getAllRules();
    const idx = all.findIndex(r => r.id === rule.id);
    if (idx >= 0) all[idx] = rule; else all.push(rule);
    this.saveRules(all);
  }

  deleteRule(id: string) {
    const all = this.getAllRules().filter(r => r.id !== id);
    this.saveRules(all);
  }

  getAllGroups(): CategoryGroup[] {
    return this.loadGroupsFromLocalStorage();
  }

  async getAllGroupsAsync(): Promise<CategoryGroup[]> {
    return await this.loadGroupsFromCache();
  }

  saveGroups(groups: CategoryGroup[]) {
    localStorage.setItem(LS_GROUPS_KEY, JSON.stringify(groups));
  }

  upsertGroup(group: CategoryGroup) {
    const all = this.getAllGroups();
    const idx = all.findIndex(g => g.id === group.id);
    if (idx >= 0) all[idx] = group; else all.push(group);
    this.saveGroups(all);
  }

  deleteGroup(id: string) {
    const all = this.getAllGroups().filter(g => g.id !== id);
    this.saveGroups(all);
  }

  // NOTA: la vista previa de "qué licitaciones coinciden con estas palabras
  // clave" (antes `sugerirDesdeKeywords`) escaneaba las tablas en memoria
  // DetalleCarteles/DetalleLineaCartel del DataManager legado, que ya no se
  // llenan (la app carga todo desde la API REST y esas tablas se publican
  // vacías varios meses en el origen). Esa vista previa ahora vive en el
  // componente `ManualCategoryEditorNew`, que trae una muestra paginada real
  // vía el hook `useProcedimientos({ buscar })` y filtra localmente sobre esa
  // muestra en vez de sobre datos fila a fila que la API no expone.

  // ================================
  // CONFIGURACIÓN DE CATEGORÍAS (ACTIVAR/DESACTIVAR)
  // ================================

  /**
   * Obtiene la configuración actual de categorías
   */
  async getCategoryConfiguration(): Promise<CategoryConfiguration> {
    const config = await this.loadConfigFromCache();
    if (config) return config;

    // Configuración por defecto: todas activas
    return {
      version: '1.0',
      categorias: {},
      lastModified: new Date().toISOString()
    };
  }

  /**
   * Guarda la configuración de categorías
   */
  saveCategoryConfiguration(config: CategoryConfiguration) {
    // Actualizar timestamp
    config.lastModified = new Date().toISOString();
    
    localStorage.setItem(LS_CONFIG_KEY, JSON.stringify(config));

    // Notificar cambio en configuración
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('categoryConfigurationUpdated'));
    }
    
    // También notificar cambio general para DataManager
    this.notifyDataManagerUpdate();
  }

  /**
   * Activa o desactiva una categoría
   */
  async toggleCategory(categoryId: string, active: boolean) {
    const config = await this.getCategoryConfiguration();
    config.categorias[categoryId] = active;
    this.saveCategoryConfiguration(config);
  }

  /**
   * Verifica si una categoría está activa
   */
  async isCategoryActive(categoryId: string): Promise<boolean> {
    const config = await this.getCategoryConfiguration();
    // Por defecto, las categorías están activas si no se especifica lo contrario
    return config.categorias[categoryId] !== false;
  }

  /**
   * Obtiene todas las categorías (automáticas por objeto de gasto + manuales)
   * con su estado. `objetosGasto` es el catálogo completo de códigos de
   * objeto de gasto (típicamente `useFiltros().data.objetos_gasto`); ya no
   * se obtiene de un DataManager en memoria porque ese catálogo ahora vive
   * en el backend.
   */
  async getAllCategoriesWithConfig(objetosGasto: string[] = []): Promise<CategoryConfigEntry[]> {
    const config = await this.getCategoryConfiguration();
    const manualRules = await this.getAllRulesAsync();

    const result: CategoryConfigEntry[] = [];

    // Agregar categorías automáticas (un objeto de gasto = una categoría "sistema")
    for (const objetoGasto of objetosGasto) {
      result.push({
        id: objetoGasto,
        nombre: objetoGasto,
        tipo: 'sistema',
        activa: config.categorias[objetoGasto] !== false // activa por defecto
      });
    }

    // Agregar categorías manuales
    for (const rule of manualRules) {
      result.push({
        id: rule.id,
        nombre: rule.nombre,
        tipo: 'manual',
        activa: config.categorias[rule.id] !== false, // activa por defecto
        palabrasClave: rule.palabrasClave,
        descripcion: rule.descripcion,
        color: rule.color
      });
    }

    return result;
  }

  /**
   * Activa todas las categorías
   */
  async activateAllCategories() {
    const config = await this.getCategoryConfiguration();
    config.categorias = {};
    this.saveCategoryConfiguration(config);
  }

  /**
   * Desactiva todas las categorías. Ver `getAllCategoriesWithConfig` sobre
   * el parámetro `objetosGasto`.
   */
  async deactivateAllCategories(objetosGasto: string[] = []) {
    const categories = await this.getAllCategoriesWithConfig(objetosGasto);
    const config = await this.getCategoryConfiguration();
    
    for (const cat of categories) {
      config.categorias[cat.id] = false;
    }
    
    this.saveCategoryConfiguration(config);
  }

  // ================================
  // GESTIÓN DE SUBCATEGORÍAS
  // ================================

  /**
   * Obtiene la configuración de subcategorías (overrides del sistema)
   */
  async getSubcategoryConfiguration(): Promise<SubcategoryConfiguration> {
    try {
      const raw = localStorage.getItem(LS_SUBCAT_CONFIG_KEY);
      if (!raw) {
        return {
          version: '1.0',
          overrides: {},
          lastModified: new Date().toISOString()
        };
      }
      return JSON.parse(raw);
    } catch {
      return {
        version: '1.0',
        overrides: {},
        lastModified: new Date().toISOString()
      };
    }
  }

  /**
   * Guarda la configuración de subcategorías
   */
  saveSubcategoryConfiguration(config: SubcategoryConfiguration) {
    config.lastModified = new Date().toISOString();
    
    localStorage.setItem(LS_SUBCAT_CONFIG_KEY, JSON.stringify(config));

    // Notificar cambio
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('subcategoryConfigurationUpdated'));
    }
    this.notifyDataManagerUpdate();
  }

  /**
   * Actualiza las subcategorías de una categoría específica
   */
  async updateSubcategories(categoryId: string, subcategories: any[]) {
    const config = await this.getSubcategoryConfiguration();
    config.overrides[categoryId] = subcategories;
    this.saveSubcategoryConfiguration(config);
  }

  /**
   * Obtiene las subcategorías de una categoría (sistema + overrides)
   */
  async getSubcategoriesForCategory(categoryId: string): Promise<any[]> {
    const config = await this.getSubcategoryConfiguration();
    return config.overrides[categoryId] || [];
  }
}

export const CategoryService = new CategoryServiceImpl();
