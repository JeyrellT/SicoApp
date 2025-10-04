// ================================
// SERVICIO DE INTEGRACIÓN DE CATEGORÍAS MANUALES
// Integra categorías manuales con el sistema de categorización automática
// ================================

import _ from 'lodash';
import { dataManager } from '../data/DataManager';
import { CategoryService } from './CategoryService';
import { ManualCategoryRule } from '../types/categories';

interface CategorizedItem {
  originalItem: any;
  categories: string[];
  confidence: number;
  matchedKeywords: string[];
  source: 'manual' | 'system' | 'hybrid';
}

interface CategoryStats {
  category: string;
  count: number;
  totalAmount: number;
  source: 'manual' | 'system';
}

class ManualCategoryIntegrationServiceImpl {
  
  /**
   * Clasifica un item (línea o cartel) usando categorías manuales
   */
  classifyWithManualCategories(texto: string): {
    categories: string[];
    confidence: number;
    keywords: string[];
  } {
    const rules = CategoryService.getAllRules();
    const activeRules = rules.filter(r => r.activo);
    
    if (activeRules.length === 0) {
      return { categories: [], confidence: 0, keywords: [] };
    }

    const textoLower = (texto || '').toLowerCase();
    const matchedCategories: Array<{
      category: string;
      keywords: string[];
      score: number;
    }> = [];

    for (const rule of activeRules) {
      const matchedKeywords: string[] = [];
      
      for (const keyword of rule.palabrasClave) {
        if (textoLower.includes(keyword.toLowerCase())) {
          matchedKeywords.push(keyword);
        }
      }

      if (matchedKeywords.length > 0) {
        const score = matchedKeywords.length / rule.palabrasClave.length;
        matchedCategories.push({
          category: rule.nombre,
          keywords: matchedKeywords,
          score
        });
      }
    }

    if (matchedCategories.length === 0) {
      return { categories: [], confidence: 0, keywords: [] };
    }

    // Ordenar por score y tomar las mejores
    const sorted = _.orderBy(matchedCategories, ['score'], ['desc']);
    const bestMatch = sorted[0];

    return {
      categories: sorted.map(m => m.category),
      confidence: bestMatch.score,
      keywords: bestMatch.keywords
    };
  }

  /**
   * Clasifica un item combinando categorías del sistema y manuales
   */
  classifyHybrid(texto: string, systemCategory?: string): CategorizedItem['categories'] {
    const manual = this.classifyWithManualCategories(texto);
    const categories: string[] = [];

    // Agregar categoría del sistema si existe
    if (systemCategory && systemCategory !== 'Sin categorizar') {
      categories.push(systemCategory);
    }

    // Agregar categorías manuales
    if (manual.categories.length > 0) {
      categories.push(...manual.categories);
    }

    return _.uniq(categories);
  }

  /**
   * Obtiene estadísticas de categorías manuales en las líneas
   */
  getManualCategoryStats(): CategoryStats[] {
    const lineas: any[] = dataManager.obtenerDatos('DetalleLineaCartel') || [];
    const categoryCounts = new Map<string, { count: number; amount: number }>();

    for (const linea of lineas) {
      const classification = this.classifyWithManualCategories(linea.descripcionLinea);
      
      for (const category of classification.categories) {
        const current = categoryCounts.get(category) || { count: 0, amount: 0 };
        categoryCounts.set(category, {
          count: current.count + 1,
          amount: current.amount + (linea.presupuestoLinea || 0)
        });
      }
    }

    const stats: CategoryStats[] = [];
    for (const [category, data] of categoryCounts.entries()) {
      stats.push({
        category,
        count: data.count,
        totalAmount: data.amount,
        source: 'manual'
      });
    }

    return _.orderBy(stats, ['count'], ['desc']);
  }

  /**
   * Obtiene todas las líneas clasificadas por una categoría manual específica
   */
  getLinesByManualCategory(categoryName: string): any[] {
    const lineas: any[] = dataManager.obtenerDatos('DetalleLineaCartel') || [];
    const result: any[] = [];

    for (const linea of lineas) {
      const classification = this.classifyWithManualCategories(linea.descripcionLinea);
      
      if (classification.categories.includes(categoryName)) {
        result.push({
          ...linea,
          manualCategory: categoryName,
          confidence: classification.confidence,
          matchedKeywords: classification.keywords
        });
      }
    }

    return result;
  }

  /**
   * Enriquece datos con categorías manuales para dashboards
   */
  enrichDataForDashboard(data: any[], textField: string = 'descripcionLinea'): any[] {
    return data.map(item => {
      const classification = this.classifyWithManualCategories(item[textField] || '');
      
      return {
        ...item,
        manualCategories: classification.categories,
        manualCategoryConfidence: classification.confidence,
        manualCategoryKeywords: classification.keywords
      };
    });
  }

  /**
   * Obtiene un resumen combinado de categorías (sistema + manuales)
   */
  getCombinedCategorySummary(): {
    systemCategories: CategoryStats[];
    manualCategories: CategoryStats[];
    totalCategorized: number;
    totalUncategorized: number;
  } {
    const lineas: any[] = dataManager.obtenerDatos('DetalleLineaCartel') || [];
    const systemRules = dataManager.getSectorRules();
    
    const systemCounts = new Map<string, { count: number; amount: number }>();
    const manualCounts = new Map<string, { count: number; amount: number }>();
    let uncategorized = 0;

    for (const linea of lineas) {
      const texto = (linea.descripcionLinea || '').toLowerCase();
      let hasCategory = false;

      // Clasificación del sistema
      for (const [sector, regexes] of Object.entries(systemRules)) {
        for (const regex of regexes) {
          if (regex.test(texto)) {
            const current = systemCounts.get(sector) || { count: 0, amount: 0 };
            systemCounts.set(sector, {
              count: current.count + 1,
              amount: current.amount + (linea.presupuestoLinea || 0)
            });
            hasCategory = true;
            break;
          }
        }
        if (hasCategory) break;
      }

      // Clasificación manual
      const manualClassification = this.classifyWithManualCategories(linea.descripcionLinea);
      if (manualClassification.categories.length > 0) {
        for (const category of manualClassification.categories) {
          const current = manualCounts.get(category) || { count: 0, amount: 0 };
          manualCounts.set(category, {
            count: current.count + 1,
            amount: current.amount + (linea.presupuestoLinea || 0)
          });
        }
        hasCategory = true;
      }

      if (!hasCategory) {
        uncategorized++;
      }
    }

    const systemStats: CategoryStats[] = [];
    for (const [category, data] of systemCounts.entries()) {
      systemStats.push({
        category,
        count: data.count,
        totalAmount: data.amount,
        source: 'system'
      });
    }

    const manualStats: CategoryStats[] = [];
    for (const [category, data] of manualCounts.entries()) {
      manualStats.push({
        category,
        count: data.count,
        totalAmount: data.amount,
        source: 'manual'
      });
    }

    return {
      systemCategories: _.orderBy(systemStats, ['count'], ['desc']),
      manualCategories: _.orderBy(manualStats, ['count'], ['desc']),
      totalCategorized: lineas.length - uncategorized,
      totalUncategorized: uncategorized
    };
  }

  /**
   * Obtiene sugerencias de categorías manuales basadas en patrones no cubiertos
   */
  suggestNewCategories(limit: number = 10): Array<{
    suggestedName: string;
    sampleDescriptions: string[];
    estimatedCount: number;
    commonWords: string[];
  }> {
    const lineas: any[] = dataManager.obtenerDatos('DetalleLineaCartel') || [];
    const systemRules = dataManager.getSectorRules();
    
    // Obtener líneas no categorizadas
    const uncategorized: any[] = [];
    
    for (const linea of lineas) {
      const texto = (linea.descripcionLinea || '').toLowerCase();
      let hasCategory = false;

      // Verificar categoría del sistema
      for (const [, regexes] of Object.entries(systemRules)) {
        for (const regex of regexes) {
          if (regex.test(texto)) {
            hasCategory = true;
            break;
          }
        }
        if (hasCategory) break;
      }

      // Verificar categoría manual
      if (!hasCategory) {
        const manualClassification = this.classifyWithManualCategories(linea.descripcionLinea);
        if (manualClassification.categories.length > 0) {
          hasCategory = true;
        }
      }

      if (!hasCategory) {
        uncategorized.push(linea);
      }
    }

    // Analizar palabras comunes en descripciones no categorizadas
    const wordFrequency = new Map<string, number>();
    
    for (const linea of uncategorized) {
      const words = (linea.descripcionLinea || '')
        .toLowerCase()
        .split(/\s+/)
        .filter((w: string) => w.length > 4); // Solo palabras de más de 4 caracteres
      
      for (const word of words) {
        wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
      }
    }

    // Crear sugerencias basadas en palabras frecuentes
    const suggestions: Array<{
      suggestedName: string;
      sampleDescriptions: string[];
      estimatedCount: number;
      commonWords: string[];
    }> = [];

    const sortedWords = _.orderBy(
      Array.from(wordFrequency.entries()),
      [1],
      ['desc']
    ).slice(0, limit);

    for (const [word, count] of sortedWords) {
      const samples = uncategorized
        .filter(l => (l.descripcionLinea || '').toLowerCase().includes(word))
        .slice(0, 3)
        .map(l => l.descripcionLinea);

      if (samples.length > 0) {
        suggestions.push({
          suggestedName: word.charAt(0).toUpperCase() + word.slice(1),
          sampleDescriptions: samples,
          estimatedCount: count,
          commonWords: [word]
        });
      }
    }

    return suggestions;
  }
}

export const ManualCategoryIntegrationService = new ManualCategoryIntegrationServiceImpl();
export type { CategorizedItem, CategoryStats };
