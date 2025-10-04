// ================================
// SERVICIO PARA CATEGORÍAS MANUALES Y SUGERENCIAS POR KEYWORDS
// ================================

import _ from 'lodash';
import { dataManager } from '../data/DataManager';
import { cacheService } from './CacheService';
import { ManualCategoryRule, CategoryGroup, CategorySuggestion, CategoryConfiguration, CategoryConfigEntry, SubcategoryConfiguration } from '../types/categories';

const LS_RULES_KEY = 'sicop.manualCategories.v1';
const LS_GROUPS_KEY = 'sicop.categoryGroups.v1';
const LS_CONFIG_KEY = 'sicop.categoryConfiguration.v1';
const LS_SUBCAT_CONFIG_KEY = 'sicop.subcategoryConfiguration.v1';
const CACHE_RULES_KEY = 'manual_categories';
const CACHE_GROUPS_KEY = 'category_groups';
const CACHE_CONFIG_KEY = 'category_configuration';
const CACHE_SUBCAT_CONFIG_KEY = 'subcategory_configuration';

class CategoryServiceImpl {
  
  // ================================
  // MÉTODOS DE PERSISTENCIA EN CACHE
  // ================================
  
  /**
   * Guarda las categorías manuales tanto en localStorage como en cache
   */
  private async persistRulesToCache(rules: ManualCategoryRule[]) {
    try {
      await cacheService.setCustomData(CACHE_RULES_KEY, rules);
      console.log('✅ Categorías manuales guardadas en cache');
    } catch (error) {
      console.error('❌ Error guardando categorías en cache:', error);
    }
  }

  /**
   * Guarda los grupos tanto en localStorage como en cache
   */
  private async persistGroupsToCache(groups: CategoryGroup[]) {
    try {
      await cacheService.setCustomData(CACHE_GROUPS_KEY, groups);
      console.log('✅ Grupos de categorías guardados en cache');
    } catch (error) {
      console.error('❌ Error guardando grupos en cache:', error);
    }
  }

  /**
   * Guarda la configuración de categorías en cache y localStorage
   */
  private async persistConfigToCache(config: CategoryConfiguration) {
    try {
      await cacheService.setCustomData(CACHE_CONFIG_KEY, config);
      console.log('✅ Configuración de categorías guardada en cache');
    } catch (error) {
      console.error('❌ Error guardando configuración en cache:', error);
    }
  }

  /**
   * Carga las categorías desde cache si existen, sino desde localStorage
   */
  private async loadRulesFromCache(): Promise<ManualCategoryRule[]> {
    try {
      const cached = await cacheService.getCustomData<ManualCategoryRule[]>(CACHE_RULES_KEY);
      if (cached && Array.isArray(cached)) {
        console.log('✅ Categorías cargadas desde cache');
        return cached;
      }
    } catch (error) {
      console.warn('⚠️ Error cargando desde cache, usando localStorage:', error);
    }
    
    // Fallback a localStorage
    return this.loadRulesFromLocalStorage();
  }

  /**
   * Carga los grupos desde cache si existen, sino desde localStorage
   */
  private async loadGroupsFromCache(): Promise<CategoryGroup[]> {
    try {
      const cached = await cacheService.getCustomData<CategoryGroup[]>(CACHE_GROUPS_KEY);
      if (cached && Array.isArray(cached)) {
        console.log('✅ Grupos cargados desde cache');
        return cached;
      }
    } catch (error) {
      console.warn('⚠️ Error cargando grupos desde cache, usando localStorage:', error);
    }
    
    // Fallback a localStorage
    return this.loadGroupsFromLocalStorage();
  }

  /**
   * Carga la configuración desde cache si existe, sino desde localStorage
   */
  private async loadConfigFromCache(): Promise<CategoryConfiguration | null> {
    try {
      const cached = await cacheService.getCustomData<CategoryConfiguration>(CACHE_CONFIG_KEY);
      if (cached) {
        console.log('✅ Configuración cargada desde cache');
        return cached;
      }
    } catch (error) {
      console.warn('⚠️ Error cargando configuración desde cache, usando localStorage:', error);
    }
    
    // Fallback a localStorage
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
    this.persistRulesToCache(rules);
    
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
    // Guardar en localStorage (sincrónico)
    localStorage.setItem(LS_GROUPS_KEY, JSON.stringify(groups));
    
    // Guardar en cache (asíncrono, no bloqueante)
    this.persistGroupsToCache(groups);
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

  // ================================
  // SUGERENCIAS DESDE KEYWORDS E INSTITUCIONES
  // ================================
  sugerirDesdeKeywords(params: {
    palabras: string[];
    instituciones?: string[]; // codigos
    limit?: number;
  }): CategorySuggestion[] {
    const palabras = (params.palabras || []).map(p => p.trim().toLowerCase()).filter(Boolean);
    if (!palabras.length) return [];

    const carteles: any[] = dataManager.obtenerDatos('DetalleCarteles') || [];
    const lineas: any[] = dataManager.obtenerDatos('DetalleLineaCartel') || [];

    // Filtrar por instituciones si aplica
    const instSet = params.instituciones && params.instituciones.length ? new Set(params.instituciones) : null;

    // Construir mapa de cartel -> líneas
    const lineasByCartel = _.groupBy(lineas, 'numeroCartel');

    // Scoring por coincidencias
    const scoreTexto = (texto: string): { score: number; hits: string[] } => {
      const t = (texto || '').toLowerCase();
      const hits = palabras.filter(p => t.includes(p));
      const score = hits.length / palabras.length; // simple ratio
      return { score, hits };
    };

    const sugerencias: CategorySuggestion[] = [];

    for (const c of carteles) {
      if (instSet && !instSet.has(c.codigoInstitucion)) continue;
      const baseTexto = `${c.nombreCartel || ''} ${c.descripcionCartel || ''}`;
      let { score, hits } = scoreTexto(baseTexto);

      // considerar líneas del cartel para mejorar score
      const ls = lineasByCartel[c.numeroCartel] || [];
      for (const l of ls) {
        const r = scoreTexto(l.descripcionLinea || '');
        if (r.score > score) { score = r.score; hits = r.hits; }
      }

      if (score > 0) {
        sugerencias.push({ numeroCartel: c.numeroCartel, texto: baseTexto.trim(), score, coincidencias: hits });
      }
    }

    return _.orderBy(sugerencias, 'score', 'desc').slice(0, params.limit || 100);
  }

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
    
    // Guardar en localStorage (sincrónico)
    localStorage.setItem(LS_CONFIG_KEY, JSON.stringify(config));
    
    // Guardar en cache (asíncrono)
    this.persistConfigToCache(config);
    
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
   * Obtiene todas las categorías (sistema + manuales) con su estado
   */
  async getAllCategoriesWithConfig(): Promise<CategoryConfigEntry[]> {
    const config = await this.getCategoryConfiguration();
    const manualRules = await this.getAllRulesAsync();
    
    // Categorías del sistema (obtener desde DataManager)
    const systemCategories = dataManager.getSystemCategoryNames?.() || [];
    
    const result: CategoryConfigEntry[] = [];

    // Agregar categorías del sistema
    for (const nombre of systemCategories) {
      const id = nombre;
      result.push({
        id,
        nombre,
        tipo: 'sistema',
        activa: config.categorias[id] !== false // activa por defecto
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
   * Desactiva todas las categorías
   */
  async deactivateAllCategories() {
    const categories = await this.getAllCategoriesWithConfig();
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
      const cached = await cacheService.getCustomData<SubcategoryConfiguration>(CACHE_SUBCAT_CONFIG_KEY);
      if (cached) return cached;
    } catch (error) {
      console.warn('⚠️ Error cargando subcategorías desde cache:', error);
    }

    // Fallback a localStorage
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
    
    // Guardar en localStorage
    localStorage.setItem(LS_SUBCAT_CONFIG_KEY, JSON.stringify(config));
    
    // Guardar en cache
    cacheService.setCustomData(CACHE_SUBCAT_CONFIG_KEY, config);
    
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
