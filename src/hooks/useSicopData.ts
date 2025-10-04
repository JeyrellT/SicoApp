import { useState, useEffect, useCallback } from 'react';
import { cacheService, CacheMetadata } from '../services/CacheService';
import { consolidationService, ConsolidationOptions } from '../services/DataConsolidationService';

/**
 * Hook personalizado para manejar el caché de archivos CSV
 */
export const useFileCache = () => {
  const [metadata, setMetadata] = useState<CacheMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Carga los metadatos del caché
   */
  const loadMetadata = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await cacheService.initDB();
      const meta = await cacheService.getMetadata();
      setMetadata(meta);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error loading cache'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  /**
   * Guarda un archivo en caché
   */
  const saveFile = useCallback(
    async (
      fileName: string,
      data: any[],
      year: number,
      month: number,
      type: string
    ): Promise<string> => {
      try {
        const fileId = await cacheService.saveFile(fileName, data, year, month, type);
        await loadMetadata(); // Recargar metadatos
        return fileId;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Error saving file');
      }
    },
    [loadMetadata]
  );

  /**
   * Elimina un archivo
   */
  const deleteFile = useCallback(
    async (fileId: string): Promise<void> => {
      try {
        await cacheService.deleteFile(fileId);
        await loadMetadata(); // Recargar metadatos
      } catch (err) {
        throw err instanceof Error ? err : new Error('Error deleting file');
      }
    },
    [loadMetadata]
  );

  /**
   * Limpia todo el caché
   */
  const clearCache = useCallback(async (): Promise<void> => {
    try {
      await cacheService.clearCache();
      await loadMetadata(); // Recargar metadatos
    } catch (err) {
      throw err instanceof Error ? err : new Error('Error clearing cache');
    }
  }, [loadMetadata]);

  /**
   * Obtiene archivos filtrados
   */
  const getFilteredFiles = useCallback(
    async (year?: number, month?: number, type?: string) => {
      try {
        return await cacheService.getFilteredFiles(year, month, type);
      } catch (err) {
        throw err instanceof Error ? err : new Error('Error getting filtered files');
      }
    },
    []
  );

  /**
   * Obtiene estadísticas del caché
   */
  const getStats = useCallback(async () => {
    try {
      return await cacheService.getCacheStats();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Error getting cache stats');
    }
  }, []);

  return {
    metadata,
    loading,
    error,
    saveFile,
    deleteFile,
    clearCache,
    getFilteredFiles,
    getStats,
    reload: loadMetadata,
  };
};

/**
 * Hook para consolidación de datos
 */
export const useDataConsolidation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Consolida datos con opciones
   */
  const consolidate = useCallback(async (options: ConsolidationOptions = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await consolidationService.consolidateData(options);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error consolidating data');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Consolida por tipo
   */
  const consolidateByType = useCallback(
    async (type: string, options: Omit<ConsolidationOptions, 'types'> = {}) => {
      return consolidate({ ...options, types: [type] });
    },
    [consolidate]
  );

  /**
   * Consolida por año
   */
  const consolidateByYear = useCallback(
    async (year: number, options: Omit<ConsolidationOptions, 'years'> = {}) => {
      return consolidate({ ...options, years: [year] });
    },
    [consolidate]
  );

  /**
   * Consolida por mes
   */
  const consolidateByMonth = useCallback(
    async (
      year: number,
      month: number,
      options: Omit<ConsolidationOptions, 'years' | 'months'> = {}
    ) => {
      return consolidate({ ...options, years: [year], months: [month] });
    },
    [consolidate]
  );

  /**
   * Descarga CSV consolidado
   */
  const downloadCSV = useCallback(
    async (fileName: string, options: ConsolidationOptions = {}) => {
      setLoading(true);
      setError(null);
      try {
        await consolidationService.downloadConsolidatedCSV(fileName, options);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Error downloading CSV');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Obtiene estadísticas consolidadas
   */
  const getStats = useCallback(async (options: ConsolidationOptions = {}) => {
    setLoading(true);
    setError(null);
    try {
      return await consolidationService.getConsolidatedStats(options);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error getting stats');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    consolidate,
    consolidateByType,
    consolidateByYear,
    consolidateByMonth,
    downloadCSV,
    getStats,
  };
};

/**
 * Hook combinado que proporciona todas las funcionalidades
 */
export const useSicopData = () => {
  const cache = useFileCache();
  const consolidation = useDataConsolidation();

  return {
    cache,
    consolidation,
  };
};
