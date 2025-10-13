/**
 * DataLoaderService - Carga datos desde el cache al DataManager
 * Consolida archivos CSV del cache y los inyecta en el DataManager de SICOP
 */

import { cacheService } from './CacheService';
import { dataManager } from '../data/DataManager';

interface LoadProgress {
  stage: string;
  current: number;
  total: number;
  percentage: number;
  details?: {
    recordsProcessed?: number;
    institutions?: number;
    filesProcessed?: number;
    speed?: string;
  };
}

type ProgressCallback = (progress: LoadProgress) => void;

class DataLoaderService {
  private isLoading = false;

  /**
   * Verifica si hay datos en cache
   */
  async hasDataInCache(): Promise<boolean> {
    const metadata = await cacheService.getMetadata();
    return metadata.files.length > 0;
  }

  /**
   * Obtiene estadísticas del cache
   */
  async getCacheStats(): Promise<{
    totalFiles: number;
    totalRecords: number;
    years: number[];
    types: string[];
  }> {
    const metadata = await cacheService.getMetadata();
    
    const years = [...new Set(metadata.files.map(f => f.year))].sort();
    const types = [...new Set(metadata.files.map(f => f.type))].sort();
    const totalRecords = metadata.files.reduce((sum, f) => sum + f.recordCount, 0);

    return {
      totalFiles: metadata.files.length,
      totalRecords,
      years,
      types
    };
  }

  /**
   * Carga datos desde el cache al DataManager
   * Consolida archivos del mismo tipo de diferentes períodos
   */
  async loadDataFromCache(
    options?: {
      years?: number[];
      months?: number[];
      types?: string[];
      onProgress?: ProgressCallback;
    }
  ): Promise<void> {
    if (this.isLoading) {
      throw new Error('Ya hay una carga en progreso');
    }

    this.isLoading = true;

    try {
      const { years, months, types, onProgress } = options || {};

      // Obtener todos los archivos del cache
      const metadata = await cacheService.getMetadata();
      
      // Filtrar archivos según opciones
      let filteredFileInfos = metadata.files;
      
      if (years && years.length > 0) {
        filteredFileInfos = filteredFileInfos.filter(f => years.includes(f.year));
      }
      
      if (months && months.length > 0) {
        filteredFileInfos = filteredFileInfos.filter(f => months.includes(f.month));
      }
      
      if (types && types.length > 0) {
        filteredFileInfos = filteredFileInfos.filter(f => types.includes(f.type));
      }

      if (filteredFileInfos.length === 0) {
        throw new Error('No hay archivos en cache que coincidan con los filtros');
      }

      // Agrupar archivos por tipo para consolidarlos
      const filesByType = new Map<string, typeof filteredFileInfos>();
      filteredFileInfos.forEach(fileInfo => {
        if (!filesByType.has(fileInfo.type)) {
          filesByType.set(fileInfo.type, []);
        }
        filesByType.get(fileInfo.type)!.push(fileInfo);
      });

      const totalTypes = filesByType.size;
      let currentType = 0;
      let totalRecordsProcessed = 0;
      const startTime = Date.now();
      const uniqueInstitutions = new Set<string>();

      // Notificar progreso inicial
      onProgress?.({
        stage: 'Iniciando carga de datos',
        current: 0,
        total: totalTypes,
        percentage: 0,
        details: {
          recordsProcessed: 0,
          institutions: 0,
          filesProcessed: 0,
          speed: 'Calculando...'
        }
      });

      // Crear objeto temporal para almacenar datos consolidados
      const consolidatedData: Record<string, any[]> = {};

      // Consolidar datos por tipo
      for (const [type, typeFiles] of filesByType.entries()) {
        currentType++;
        
        // Calcular velocidad de procesamiento
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        const recordsPerSecond = totalRecordsProcessed / Math.max(elapsedSeconds, 1);
        const speed = recordsPerSecond > 1000 
          ? `${(recordsPerSecond / 1000).toFixed(1)}K/s`
          : `${Math.round(recordsPerSecond)}/s`;
        
        onProgress?.({
          stage: `Consolidando ${type}`,
          current: currentType,
          total: totalTypes,
          percentage: Math.round((currentType / totalTypes) * 50), // 50% para consolidación
          details: {
            recordsProcessed: totalRecordsProcessed,
            institutions: uniqueInstitutions.size,
            filesProcessed: currentType - 1,
            speed
          }
        });

        let allRecords: any[] = [];

        // Combinar todos los archivos del mismo tipo
        // Usar concat en lugar de push para mejor rendimiento
        for (const fileInfo of typeFiles) {
          const fileData = await cacheService.getFile(fileInfo.id);
          if (fileData && fileData.data && fileData.data.length > 0) {
            // Agregar columnas de metadatos para tracking y filtrado posterior
            const dataWithMetadata = fileData.data.map(record => {
              // Extraer instituciones únicas
              if (record.Institucion || record.INSTITUCION || record.institucion) {
                uniqueInstitutions.add(
                  record.Institucion || record.INSTITUCION || record.institucion
                );
              }
              
              return {
                ...record,
                _YEAR: fileInfo.year,
                _MONTH: fileInfo.month,
                _FILE_SOURCE: fileInfo.fileName,
                _UPLOAD_DATE: fileInfo.uploadDate
              };
            });
            // Usar concat que es más eficiente para arrays grandes
            allRecords = allRecords.concat(dataWithMetadata);
            totalRecordsProcessed += dataWithMetadata.length;
          }
        }

        // NO deduplicar aquí - los datos ya están limpios en cache
        // La deduplicación se hace cuando se guardan los archivos originales
        consolidatedData[type] = allRecords;

        console.log(`✅ ${type}: ${allRecords.length} registros consolidados`);
      }

      // Inyectar datos directamente en el DataManager
      await this.injectDataIntoDataManager(consolidatedData, onProgress);

      onProgress?.({
        stage: 'Carga completada',
        current: 1,
        total: 1,
        percentage: 100
      });

      console.log('🎉 Datos cargados exitosamente en DataManager desde cache');

    } catch (error) {
      console.error('💥 Error cargando datos desde cache:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Inyecta datos directamente en el DataManager
   * Usa el nuevo método loadDataFromMemory del DataManager
   */
  private async injectDataIntoDataManager(
    consolidatedData: Record<string, any[]>,
    onProgress?: ProgressCallback
  ): Promise<void> {
    const totalRecords = Object.values(consolidatedData).reduce(
      (sum, records) => sum + records.length, 
      0
    );
    
    onProgress?.({
      stage: 'Inyectando datos en DataManager',
      current: 0,
      total: 1,
      percentage: 75,
      details: {
        recordsProcessed: totalRecords,
        filesProcessed: Object.keys(consolidatedData).length
      }
    });

    // Usar el nuevo método del DataManager que acepta datos directamente
    await dataManager.loadDataFromMemory(consolidatedData);

    onProgress?.({
      stage: 'Datos inyectados exitosamente',
      current: 1,
      total: 1,
      percentage: 95,
      details: {
        recordsProcessed: totalRecords,
        filesProcessed: Object.keys(consolidatedData).length
      }
    });
  }

  /**
   * Limpia los datos cargados del DataManager
   */
  clearLoadedData(): void {
    // Aquí llamaríamos a un método del DataManager para limpiar
    console.log('🧹 Limpiando datos del DataManager...');
    // dataManager.clear()
  }
}

export const dataLoaderService = new DataLoaderService();
