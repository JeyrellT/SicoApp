// ================================
// HOOKS PERSONALIZADOS PARA FILTROS SICOP
// ================================

import { useState, useEffect, useMemo } from 'react';
import { dataManager } from '../data/DataManager';

// ================================
// HOOK DE DEBOUNCE
// ================================

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ================================
// HOOK PARA BÚSQUEDA DE INSTITUCIONES
// ================================

interface UseInstitutionSearchResult {
  institutions: Array<{
    id: string;
    label: string;
    value: string;
    count?: number;
    type: 'institution';
  }>;
  isSearching: boolean;
  totalCount: number;
}

export function useInstitutionSearch(
  searchTerm: string,
  debounceMs: number = 300,
  limit: number = 50
): UseInstitutionSearchResult {
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, debounceMs);

  const result = useMemo(() => {
    setIsSearching(true);
    
    try {
      const institutions = dataManager.searchInstitutions?.(debouncedSearchTerm, limit) || [];
      const totalCount = dataManager.getAvailableInstitutions?.()?.length || 0;
      
      return {
        institutions,
        totalCount,
        isSearching: false
      };
    } catch (error) {
      console.error('Error searching institutions:', error);
      return {
        institutions: [],
        totalCount: 0,
        isSearching: false
      };
    } finally {
      setIsSearching(false);
    }
  }, [debouncedSearchTerm, limit]);

  useEffect(() => {
    if (searchTerm !== debouncedSearchTerm) {
      setIsSearching(true);
    }
  }, [searchTerm, debouncedSearchTerm]);

  return {
    ...result,
    isSearching: searchTerm !== debouncedSearchTerm || result.isSearching
  };
}

// ================================
// HOOK PARA BÚSQUEDA DE CATEGORÍAS
// ================================

interface UseCategorySearchResult {
  categories: Array<{
    id: string;
    label: string;
    value: string;
    count?: number;
    type: 'category';
  }>;
  isSearching: boolean;
  totalCount: number;
}

export function useCategorySearch(
  searchTerm: string,
  debounceMs: number = 300,
  limit: number = 50
): UseCategorySearchResult {
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, debounceMs);

  const result = useMemo(() => {
    setIsSearching(true);
    
    try {
      const categories = dataManager.searchCategories?.(debouncedSearchTerm, limit) || [];
      const totalCount = dataManager.getAvailableCategories?.()?.length || 0;
      
      return {
        categories,
        totalCount,
        isSearching: false
      };
    } catch (error) {
      console.error('Error searching categories:', error);
      return {
        categories: [],
        totalCount: 0,
        isSearching: false
      };
    } finally {
      setIsSearching(false);
    }
  }, [debouncedSearchTerm, limit]);

  useEffect(() => {
    if (searchTerm !== debouncedSearchTerm) {
      setIsSearching(true);
    }
  }, [searchTerm, debouncedSearchTerm]);

  return {
    ...result,
    isSearching: searchTerm !== debouncedSearchTerm || result.isSearching
  };
}

// ================================
// HOOK PARA ESTADÍSTICAS DE FILTROS
// ================================

interface FilterStats {
  total: number;
  filtered: number;
  percentage: number;
  institutionsActive: number;
  categoriesActive: number;
}

export function useFilterStats(filters?: { institucion?: string[]; sector?: string[] }): FilterStats {
  return useMemo(() => {
    try {
      return dataManager.getFilterStats?.(filters) || {
        total: 0,
        filtered: 0,
        percentage: 0,
        institutionsActive: 0,
        categoriesActive: 0
      };
    } catch (error) {
      console.error('Error getting filter stats:', error);
      return {
        total: 0,
        filtered: 0,
        percentage: 0,
        institutionsActive: 0,
        categoriesActive: 0
      };
    }
  }, [filters]);
}

// ================================
// HOOK COMBINADO PARA FILTROS AVANZADOS
// ================================

interface UseAdvancedFiltersResult {
  institutionSearch: UseInstitutionSearchResult;
  categorySearch: UseCategorySearchResult;
  filterStats: FilterStats;
  resetSearches: () => void;
}

export function useAdvancedFilters(
  institutionSearchTerm: string,
  categorySearchTerm: string,
  appliedFilters?: { institucion?: string[]; sector?: string[] },
  debounceMs: number = 300
): UseAdvancedFiltersResult {
  const institutionSearch = useInstitutionSearch(institutionSearchTerm, debounceMs);
  const categorySearch = useCategorySearch(categorySearchTerm, debounceMs);
  const filterStats = useFilterStats(appliedFilters);

  const resetSearches = () => {
    // This would need to be handled by the parent component
    // that manages the search terms
  };

  return {
    institutionSearch,
    categorySearch,
    filterStats,
    resetSearches
  };
}