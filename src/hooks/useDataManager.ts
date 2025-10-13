/**
 * useDataManager - Custom Hook para gestión centralizada de datos SICOP
 * 
 * Este hook encapsula toda la lógica de carga, sincronización y estado de datos.
 * Proporciona una interfaz simple y predecible para componentes que necesitan datos.
 * 
 * Estados posibles:
 * - idle: Sin datos, esperando acción
 * - checking-cache: Verificando si hay datos en caché
 * - loading: Cargando datos desde caché
 * - loaded: Datos cargados y listos
 * - error: Error durante la carga
 * 
 * @example
 * const { isLoaded, estadisticas, load } = useDataManager();
 */

import { useState, useCallback, useEffect } from 'react';
import { dataLoaderService } from '../services/DataLoaderService';
import { dataManager } from '../data/DataManager';
import { filterService } from '../services/FilterService';
import type { InstitucionRegistrada, Proveedor } from '../types/entities';

// ================================
// TYPES
// ================================

type DataStatus = 
  | 'idle'           // Estado inicial, sin datos
  | 'checking-cache' // Verificando disponibilidad de caché
  | 'loading'        // Cargando datos activamente
  | 'loaded'         // Datos completamente cargados
  | 'error';         // Error durante la carga

interface EstadisticasGenerales {
  carteles: number;
  contratos: number;
  proveedores: number;
  instituciones: number;
  ofertas: number;
}

interface LoadingDetails {
  recordsProcessed: number;
  institutions: number;
  filesProcessed: number;
  speed: string;
}

interface DataManagerState {
  status: DataStatus;
  progress: number;
  stage: string;
  loadingDetails: LoadingDetails;
  estadisticas: EstadisticasGenerales | null;
  instituciones: InstitucionRegistrada[];
  proveedores: Proveedor[];
  keywordsComunes: string[];
  error: Error | null;
}

interface LoadProgress {
  percentage: number;
  stage: string;
  details?: {
    recordsProcessed?: number;
    institutions?: number;
    filesProcessed?: number;
    speed?: string;
  };
}

// ================================
// HOOK
// ================================

export function useDataManager() {
  // Estado centralizado
  const [state, setState] = useState<DataManagerState>({
    status: 'idle',
    progress: 0,
    stage: '',
    loadingDetails: {
      recordsProcessed: 0,
      institutions: 0,
      filesProcessed: 0,
      speed: '---'
    },
    estadisticas: null,
    instituciones: [],
    proveedores: [],
    keywordsComunes: [],
    error: null
  });

  /**
   * Carga datos desde el caché al DataManager
   * Verifica disponibilidad de caché antes de intentar cargar
   */
  const load = useCallback(async () => {
    console.log('🚀 useDataManager.load() iniciado');
    
    // Paso 1: Verificar caché
    setState(s => ({ 
      ...s, 
      status: 'checking-cache', 
      stage: 'Verificando disponibilidad de datos en caché...',
      error: null 
    }));
    
    try {
      const hasCache = await dataLoaderService.hasDataInCache();
      
      if (!hasCache) {
        console.warn('⚠️ No hay datos en caché');
        setState(s => ({ 
          ...s, 
          status: 'error', 
          error: new Error('No hay datos en caché. Por favor, carga archivos CSV primero.'),
          stage: 'Error: Sin datos disponibles'
        }));
        return;
      }

      console.log('✅ Caché verificado, iniciando carga...');
      
      // Paso 2: Cargar datos
      setState(s => ({ 
        ...s, 
        status: 'loading', 
        progress: 0,
        stage: 'Iniciando carga de datos...',
        loadingDetails: {
          ...s.loadingDetails,
          speed: '---'
        }
      }));
      
      await dataLoaderService.loadDataFromCache({
        onProgress: (progress: LoadProgress) => {
          setState(s => ({ 
            ...s, 
            progress: progress.percentage, 
            stage: progress.stage,
            loadingDetails: {
              recordsProcessed: progress.details?.recordsProcessed ?? s.loadingDetails.recordsProcessed,
              institutions: progress.details?.institutions ?? s.loadingDetails.institutions,
              filesProcessed: progress.details?.filesProcessed ?? s.loadingDetails.filesProcessed,
              speed: progress.details?.speed ?? s.loadingDetails.speed
            }
          }));
          console.log(`📊 Progreso: ${progress.percentage}% - ${progress.stage}`);
        }
      });
      
      console.log('✅ Datos cargados en DataManager');
      
      // Paso 3: Extraer datos del DataManager
      console.log('📦 Extrayendo datos del DataManager...');
      
      const estadisticas = dataManager.obtenerEstadisticasGenerales();
      const instituciones = filterService.obtenerInstituciones();
      const proveedores = filterService.obtenerProveedores();
      const keywordsComunes = filterService.obtenerKeywordsComunes(50);
      
      console.log('✅ Datos extraídos:', {
        carteles: estadisticas.carteles,
        instituciones: instituciones.length,
        proveedores: proveedores.length
      });
      
      // Paso 4: Actualizar estado a "loaded"
      setState(s => ({
        ...s,
        status: 'loaded',
        progress: 100,
        stage: 'Datos cargados exitosamente',
        loadingDetails: {
          recordsProcessed: estadisticas.carteles,
          institutions: instituciones.length,
          filesProcessed: s.loadingDetails.filesProcessed || 0,
          speed: 'Completado'
        },
        estadisticas,
        instituciones,
        proveedores,
        keywordsComunes,
        error: null
      }));
      
      console.log('🎉 useDataManager.load() completado exitosamente');
      
    } catch (error) {
      console.error('💥 Error en useDataManager.load():', error);
      setState(s => ({ 
        ...s, 
        status: 'error', 
        error: error as Error,
        stage: `Error: ${(error as Error).message}`
      }));
    }
  }, []);

  /**
   * Resetear estado a idle
   * Útil para forzar una recarga completa
   */
  const reset = useCallback(() => {
    console.log('🔄 useDataManager.reset() llamado');
    setState({
      status: 'idle',
      progress: 0,
      stage: '',
      loadingDetails: {
        recordsProcessed: 0,
        institutions: 0,
        filesProcessed: 0,
        speed: '---'
      },
      estadisticas: null,
      instituciones: [],
      proveedores: [],
      keywordsComunes: [],
      error: null
    });
  }, []);

  /**
   * Auto-sincronización con DataManager
   * Si DataManager ya tiene datos cargados (ej: después de F5),
   * sincronizar automáticamente el estado del hook
   */
  useEffect(() => {
    // Solo sincronizar si estamos en idle y DataManager tiene datos
    if (state.status === 'idle' && dataManager.isDataLoaded) {
      console.log('🔄 Auto-sincronizando con DataManager existente...');
      
      try {
        const estadisticas = dataManager.obtenerEstadisticasGenerales();
        const instituciones = filterService.obtenerInstituciones();
        const proveedores = filterService.obtenerProveedores();
        const keywordsComunes = filterService.obtenerKeywordsComunes(50);
        
        setState({
          status: 'loaded',
          progress: 100,
          stage: 'Sincronizado desde DataManager',
          loadingDetails: {
            recordsProcessed: estadisticas.carteles,
            institutions: instituciones.length,
            filesProcessed: 0,
            speed: 'Sincronizado'
          },
          estadisticas,
          instituciones,
          proveedores,
          keywordsComunes,
          error: null
        });
        
        console.log('✅ Auto-sincronización completada');
      } catch (error) {
        console.error('⚠️ Error en auto-sincronización:', error);
        // No fallar silenciosamente, pero tampoco bloquear
        // El usuario puede intentar cargar manualmente
      }
    }
  }, [state.status]); // Solo depende de status para evitar loops

  // ================================
  // RETURN VALUE
  // ================================

  return {
    // Estado raw
    status: state.status,
    progress: state.progress,
    stage: state.stage,
    loadingDetails: state.loadingDetails,
    error: state.error,
    
    // Datos
    estadisticas: state.estadisticas,
    instituciones: state.instituciones,
    proveedores: state.proveedores,
    keywordsComunes: state.keywordsComunes,
    
    // Flags derivados (más convenientes)
    isIdle: state.status === 'idle',
    isCheckingCache: state.status === 'checking-cache',
    isLoading: state.status === 'loading' || state.status === 'checking-cache',
    isLoaded: state.status === 'loaded',
    hasError: state.status === 'error',
    
    // Acciones
    load,
    reset
  };
}

// Tipo del return value para usar en Context
export type DataManagerHook = ReturnType<typeof useDataManager>;
