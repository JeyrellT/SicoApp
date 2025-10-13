// ================================
// CONTEXTO GLOBAL DE DATOS SICOP - REFACTORIZADO
// ================================
// Provee acceso centralizado a los datos y servicios
// Usa useDataManager hook para gestión de estado simplificada

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useDataManager, type DataManagerHook } from '../hooks/useDataManager';
import { dataManager } from '../data/DataManager';
import { filterService } from '../services/FilterService';
import { reportService } from '../services/ReportService';
import { metricsService, MetricasAvanzadas, AlertaInteligente } from '../services/MetricsService';
import { 
  FiltroBusqueda, 
  ResultadoBusqueda, 
  DetalleCartel,
  Proveedor,
  InstitucionRegistrada 
} from '../types/entities';

// ================================
// INTERFACES DEL CONTEXTO
// ================================

interface SicopContextValue {
  // Del hook de DataManager
  status: DataManagerHook['status'];
  progress: number;
  stage: string;
  loadingDetails: DataManagerHook['loadingDetails'];
  estadisticas: DataManagerHook['estadisticas'];
  instituciones: InstitucionRegistrada[];
  proveedores: Proveedor[];
  keywordsComunes: string[];
  isIdle: boolean;
  isCheckingCache: boolean;
  isLoading: boolean;
  isLoaded: boolean;
  hasError: boolean;
  load: () => Promise<void>;
  reset: () => void;
  
  // Métricas avanzadas
  metricasAvanzadas: MetricasAvanzadas | null;
  alertasActivas: AlertaInteligente[];

  // Métodos principales
  buscarOportunidades: (filtros: FiltroBusqueda) => ResultadoBusqueda;
  analizarCompetencia: (idProveedor: string, sectores?: string[]) => any;
  generarReporte: (parametros: any) => any;
  
  // Filtros especializados
  buscarNichosPocaCompetencia: (parametros: any) => DetalleCartel[];
  analizarPatronesInstitucion: (codigoInstitucion: string, parametros: any) => any;
  analizarEstacionalidad: (parametros: any) => any;

  // Búsqueda específica por número SICOP
  buscarCartelPorNumero: (numero: string) => any | null;
  sugerirCarteles: (query: string, limit?: number) => Array<{ numeroCartel: string; nombreCartel: string; codigoInstitucion: string }>;

  // Métricas y análisis
  actualizarMetricas: () => Promise<void>;
  obtenerTendenciasTempo: (dias?: number) => any[];

  // Utilidades
  limpiarError: () => void;
  obtenerDatos: (tabla: string) => any[];
  
  // Compatibilidad con API anterior
  estadisticasGenerales: any;
  loadingProgress: number;
  loadingStage: string;
  error: string | null;
  cargarDatos: () => Promise<void>;
}

const SicopContext = createContext<SicopContextValue | undefined>(undefined);

// ================================
// PROVEEDOR DEL CONTEXTO
// ================================

interface SicopProviderProps {
  children: ReactNode;
}

export const SicopProvider: React.FC<SicopProviderProps> = ({ children }) => {
  // ================================
  // USAR EL HOOK DE DATA MANAGER
  // ================================
  const dataManagerHook = useDataManager();

  // ================================
  // ESTADO LOCAL (solo para métricas)
  // ================================
  const [metricasAvanzadas, setMetricasAvanzadas] = useState<MetricasAvanzadas | null>(null);
  const [alertasActivas, setAlertasActivas] = useState<AlertaInteligente[]>([]);

  // ================================
  // EFECTOS
  // ================================

  useEffect(() => {
    // Cargar métricas cuando los datos estén listos
    if (dataManagerHook.isLoaded && !metricasAvanzadas) {
      console.log('📊 Datos cargados, actualizando métricas...');
      actualizarMetricas();
    }
  }, [dataManagerHook.isLoaded]); // Solo depende de isLoaded

  useEffect(() => {
    // Listener para actualizaciones manuales de categorías
    const handleManualCategoriesUpdate = () => {
      console.log('🔄 Categorías manuales actualizadas, invalidando caché...');
      dataManager.invalidarCacheSectores();
      
      // Re-calcular métricas si están cargadas
      if (dataManagerHook.isLoaded) {
        actualizarMetricas();
      }
    };

    window.addEventListener('manualCategoriesUpdated', handleManualCategoriesUpdate);
    
    return () => {
      window.removeEventListener('manualCategoriesUpdated', handleManualCategoriesUpdate);
    };
  }, [dataManagerHook.isLoaded]);

  // ================================
  // MÉTODOS PRINCIPALES
  // ================================

  const buscarOportunidades = (filtros: FiltroBusqueda): ResultadoBusqueda => {
    if (!dataManagerHook.isLoaded) {
      throw new Error('Datos no cargados. Llame a load() primero.');
    }
    
    try {
      return dataManager.buscarOportunidades(filtros);
    } catch (err) {
      console.error('Error buscando oportunidades:', err);
      throw err;
    }
  };

  const analizarCompetencia = (idProveedor: string, sectores?: string[]) => {
    if (!dataManagerHook.isLoaded) {
      throw new Error('Datos no cargados.');
    }
    
    try {
      return dataManager.analizarCompetencia(idProveedor, sectores);
    } catch (err) {
      console.error('Error analizando competencia:', err);
      throw err;
    }
  };

  const generarReporte = (parametros: any) => {
    if (!dataManagerHook.isLoaded) {
      throw new Error('Datos no cargados.');
    }
    
    try {
      return reportService.generarReporteEjecutivo(parametros);
    } catch (err) {
      console.error('Error generando reporte:', err);
      throw err;
    }
  };

  const buscarNichosPocaCompetencia = (parametros: any): DetalleCartel[] => {
    if (!dataManagerHook.isLoaded) {
      throw new Error('Datos no cargados.');
    }
    
    try {
      return filterService.buscarNichosPocaCompetencia(parametros);
    } catch (err) {
      console.error('Error buscando nichos:', err);
      throw err;
    }
  };

  const analizarPatronesInstitucion = (codigoInstitucion: string, parametros: any) => {
    if (!dataManagerHook.isLoaded) {
      throw new Error('Datos no cargados.');
    }
    
    try {
      return filterService.analizarPatronesInstitucion(codigoInstitucion, parametros);
    } catch (err) {
      console.error('Error analizando patrones:', err);
      throw err;
    }
  };

  const analizarEstacionalidad = (parametros: any) => {
    if (!dataManagerHook.isLoaded) {
      throw new Error('Datos no cargados.');
    }
    
    try {
      return filterService.analizarEstacionalidad(parametros);
    } catch (err) {
      console.error('Error analizando estacionalidad:', err);
      throw err;
    }
  };

  const buscarCartelPorNumero = (numero: string) => {
    if (!dataManagerHook.isLoaded) return null;
    
    try {
      return dataManager.obtenerDossierCartel(numero);
    } catch (err) {
      console.error('Error buscando cartel:', err);
      return null;
    }
  };

  const sugerirCarteles = (query: string, limit: number = 10) => {
    type S = { numeroCartel: string; nombreCartel: string; codigoInstitucion: string };
    if (!dataManagerHook.isLoaded) return [] as S[];
    
    try {
      const qRaw = String(query || '').trim();
      if (!qRaw) return [] as S[];
      
      const normNro = (v: any) => String(v ?? '').trim().replace(/\s+/g, '').replace(/[^0-9A-Za-z-]/g, '').toLowerCase();
      const generarVariantes = (raw: string): string[] => {
        const s = normNro(raw);
        if (!s) return [];
        const vars = new Set<string>();
        vars.add(s);
        vars.add(s.replace(/-/g, ''));
        vars.add(s.replace(/\b0+(\d+)/g, '$1'));
        const digits = s.replace(/\D+/g, '');
        if (digits.length >= 4) vars.add(digits);
        return Array.from(vars);
      };
      
      const queryVariants = generarVariantes(qRaw);
      const carteles = dataManager.obtenerDatos('DetalleCarteles') || [];
      const matches: S[] = [];
      const seen = new Set<string>();
      
      for (const c of carteles) {
        if (matches.length >= limit) break;
        const nroC = normNro(c.NumeroCartel);
        if (seen.has(nroC)) continue;
        
        if (queryVariants.some(v => nroC.includes(v) || v.includes(nroC))) {
          matches.push({
            numeroCartel: c.NumeroCartel,
            nombreCartel: c.Descripcion || '',
            codigoInstitucion: c.CodigoInstitucion || ''
          });
          seen.add(nroC);
        }
      }
      
      return matches;
    } catch (err) {
      console.error('Error sugiriendo carteles:', err);
      return [] as S[];
    }
  };

  const actualizarMetricas = async (): Promise<void> => {
    if (!dataManagerHook.isLoaded) return;

    try {
      console.log('🔄 Actualizando métricas avanzadas...');
      
      const carteles = dataManager.obtenerDatos('DetalleCarteles');
      const contratos = dataManager.obtenerDatos('Contratos');
      const sanciones = dataManager.obtenerDatos('SancionProveedores') || [];
      const participacion = dataManager.obtenerDatos('Ofertas') || [];
      
      const metricas = metricsService.calcularMetricasCompletas(
        carteles,
        contratos,
        dataManagerHook.proveedores,
        dataManagerHook.instituciones,
        sanciones,
        participacion
      );
      
      setMetricasAvanzadas(metricas);
      setAlertasActivas(metricas.alertas);
      
      console.log('✅ Métricas actualizadas');
    } catch (err) {
      console.error('⚠️ Error actualizando métricas:', err);
    }
  };

  const obtenerTendenciasTempo = (dias: number = 30) => {
    if (!dataManagerHook.isLoaded) return [];
    
    try {
      const carteles = dataManager.obtenerDatos('DetalleCarteles');
      const contratos = dataManager.obtenerDatos('Contratos');
      return metricsService.analizarTendenciasTempo(carteles, contratos, dias);
    } catch (err) {
      console.error('Error calculando tendencias:', err);
      return [];
    }
  };

  const limpiarError = () => {
    dataManagerHook.reset();
  };

  const obtenerDatos = (tabla: string): any[] => {
    if (!dataManagerHook.isLoaded) return [];
    return dataManager.obtenerDatos(tabla);
  };

  // ================================
  // VALOR DEL CONTEXTO
  // ================================

  const contextValue: SicopContextValue = {
    // Del hook de DataManager
    ...dataManagerHook,
    
    // Métricas locales
    metricasAvanzadas,
    alertasActivas,
    
    // Métodos de servicios
    buscarOportunidades,
    analizarCompetencia,
    generarReporte,
    buscarNichosPocaCompetencia,
    analizarPatronesInstitucion,
    analizarEstacionalidad,
    buscarCartelPorNumero,
    sugerirCarteles,
    actualizarMetricas,
    obtenerTendenciasTempo,
    limpiarError,
    obtenerDatos,
    
    // Compatibilidad con API anterior
    estadisticasGenerales: dataManagerHook.estadisticas || {},
    isLoading: dataManagerHook.isLoading,
    isLoaded: dataManagerHook.isLoaded,
    loadingProgress: dataManagerHook.progress,
    loadingStage: dataManagerHook.stage,
    error: dataManagerHook.error?.message || null,
    cargarDatos: dataManagerHook.load
  };

  return (
    <SicopContext.Provider value={contextValue}>
      {children}
    </SicopContext.Provider>
  );
};

// ================================
// HOOK PARA USAR EL CONTEXTO
// ================================

export const useSicop = (): SicopContextValue => {
  const context = useContext(SicopContext);
  
  if (context === undefined) {
    throw new Error('useSicop debe usarse dentro de SicopProvider');
  }
  
  return context;
};
