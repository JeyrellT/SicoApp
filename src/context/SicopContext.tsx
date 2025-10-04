// ================================
// CONTEXTO GLOBAL DE DATOS SICOP
// ================================
// Provee acceso centralizado a los datos y servicios

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
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
  // Estado de carga
  isLoaded: boolean;
  isLoading: boolean;
  loadingProgress: number;
  loadingStage: string;
  error: string | null;

  // Datos básicos
  estadisticasGenerales: any;
  instituciones: InstitucionRegistrada[];
  proveedores: Proveedor[];
  keywordsComunes: string[];

  // Métricas avanzadas
  metricasAvanzadas: MetricasAvanzadas | null;
  alertasActivas: AlertaInteligente[];

  // Métodos principales
  cargarDatos: () => Promise<void>;
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
  // ESTADO LOCAL
  // ================================
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const [estadisticasGenerales, setEstadisticasGenerales] = useState<any>({});
  const [instituciones, setInstituciones] = useState<InstitucionRegistrada[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [keywordsComunes, setKeywordsComunes] = useState<string[]>([]);
  const [metricasAvanzadas, setMetricasAvanzadas] = useState<MetricasAvanzadas | null>(null);
  const [alertasActivas, setAlertasActivas] = useState<AlertaInteligente[]>([]);

  // ================================
  // EFECTOS
  // ================================

  useEffect(() => {
    // Verificar si los datos ya están cargados
    if (dataManager.isDataLoaded) {
      actualizarEstadoPostCarga();
    }
  }, []);

  useEffect(() => {
    // Cargar métricas cuando los datos estén listos
    if (isLoaded && !metricasAvanzadas) {
      actualizarMetricas();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, metricasAvanzadas]);

  useEffect(() => {
    // Monitorear progreso de carga
    if (isLoading) {
      const interval = setInterval(() => {
        setLoadingProgress(dataManager.progress);
        setLoadingStage(dataManager.stage);
        
        if (dataManager.isDataLoaded) {
          actualizarEstadoPostCarga();
          clearInterval(interval);
        }
      }, 500);

      return () => clearInterval(interval);
    }
  }, [isLoading]);

  // ================================
  // MÉTODOS PRINCIPALES
  // ================================

  const cargarDatos = async (): Promise<void> => {
    if (isLoaded || isLoading) return;

    try {
      setIsLoading(true);
      setError(null);
      setLoadingProgress(0);

      console.log('🚀 Iniciando carga desde contexto...');
      
      // Determinar la ruta de los CSV
      const rutaCSV = process.env.NODE_ENV === 'development' 
        ? '/cleaned'  // En desarrollo, desde public/cleaned
        : '/cleaned'; // En producción, desde la carpeta pública
      
      await dataManager.cargarDatos(rutaCSV);
      
      actualizarEstadoPostCarga();
      
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error desconocido';
      console.error('💥 Error en carga de datos:', mensaje);
      setError(`Error cargando datos: ${mensaje}`);
    } finally {
      setIsLoading(false);
    }
  };

  const actualizarEstadoPostCarga = (): void => {
    try {
      setIsLoaded(true);
      setLoadingProgress(100);
      
      // Cargar datos auxiliares
      const stats = dataManager.obtenerEstadisticasGenerales();
      const instits = filterService.obtenerInstituciones();
      const provs = filterService.obtenerProveedores();
      const keywords = filterService.obtenerKeywordsComunes(50);
      
      console.log('🔍 SicopContext - Datos cargados:', {
        estadisticas: stats,
        instituciones: instits?.length || 0,
        institucionesSample: instits?.slice(0, 2),
        institucionesFields: instits?.[0] ? Object.keys(instits[0]) : [],
        proveedores: provs?.length || 0,
        keywords: keywords?.length || 0,
        keywordsSample: keywords?.slice(0, 5)
      });
      
      setEstadisticasGenerales(stats);
      setInstituciones(instits);
      setProveedores(provs);
      setKeywordsComunes(keywords);
      
      console.log('✅ Estado actualizado post-carga');
      
    } catch (err) {
      console.error('⚠️ Error actualizando estado:', err);
      setError('Error procesando datos cargados');
    }
  };

  const buscarOportunidades = (filtros: FiltroBusqueda): ResultadoBusqueda => {
    if (!isLoaded) {
      throw new Error('Datos no cargados. Llame a cargarDatos() primero.');
    }
    
    try {
      return dataManager.buscarOportunidades(filtros);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error en búsqueda';
      setError(mensaje);
      throw err;
    }
  };

  const analizarCompetencia = (idProveedor: string, sectores?: string[]): any => {
    if (!isLoaded) {
      throw new Error('Datos no cargados.');
    }
    
    try {
      return dataManager.analizarCompetencia(idProveedor, sectores);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error en análisis';
      setError(mensaje);
      throw err;
    }
  };

  const generarReporte = (parametros: any): any => {
    if (!isLoaded) {
      throw new Error('Datos no cargados.');
    }
    
    try {
      return reportService.generarReporteEjecutivo(parametros);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error generando reporte';
      setError(mensaje);
      throw err;
    }
  };

  // ================================
  // MÉTRICAS AVANZADAS
  // ================================

  const actualizarMetricas = async (): Promise<void> => {
    if (!isLoaded) return;
    
    try {
      const carteles = dataManager.obtenerDatos('DetalleCarteles') as DetalleCartel[];
      const contratos = dataManager.obtenerDatos('Contratos') as any[];
      const sanciones = dataManager.obtenerDatos('SancionProveedores') || [];
      const participacion = dataManager.obtenerDatos('Ofertas') || [];
      
      const metricas = metricsService.calcularMetricasCompletas(
        carteles, 
        contratos, 
        proveedores, 
        instituciones, 
        sanciones, 
        participacion
      );
      
      setMetricasAvanzadas(metricas);
      setAlertasActivas(metricas.alertas);
    } catch (err) {
      console.error('Error actualizando métricas:', err);
    }
  };

  const obtenerTendenciasTempo = (dias: number = 30): any[] => {
    if (!isLoaded) return [];
    
    try {
      const carteles = dataManager.obtenerDatos('DetalleCarteles') as DetalleCartel[];
      const contratos = dataManager.obtenerDatos('Contratos') as any[];
      return metricsService.analizarTendenciasTempo(carteles, contratos, dias);
    } catch (err) {
      console.error('Error obteniendo tendencias:', err);
      return [];
    }
  };

  // ================================
  // FILTROS ESPECIALIZADOS
  // ================================

  const buscarNichosPocaCompetencia = (parametros: any): DetalleCartel[] => {
    if (!isLoaded) return [];
    
    try {
      return filterService.buscarNichosPocaCompetencia(parametros);
    } catch (err) {
      console.error('Error buscando nichos:', err);
      return [];
    }
  };

  const analizarPatronesInstitucion = (codigoInstitucion: string, parametros: any): any => {
    if (!isLoaded) return {};
    
    try {
      return filterService.analizarPatronesInstitucion(codigoInstitucion, parametros);
    } catch (err) {
      console.error('Error analizando patrones:', err);
      return {};
    }
  };

  const analizarEstacionalidad = (parametros: any): any => {
    if (!isLoaded) return {};
    
    try {
      return filterService.analizarEstacionalidad(parametros);
    } catch (err) {
      console.error('Error analizando estacionalidad:', err);
      return {};
    }
  };

  // ================================
  // BÚSQUEDA POR NÚMERO SICOP
  // ================================
  const buscarCartelPorNumero = (numero: string): any | null => {
    if (!isLoaded) return null;
    try {
      return dataManager.obtenerDossierCartel(numero);
    } catch (err) {
      console.error('Error buscando cartel por número:', err);
      return null;
    }
  };

  const sugerirCarteles = (query: string, limit: number = 8) => {
    type S = { numeroCartel: string; nombreCartel: string; codigoInstitucion: string };
    if (!isLoaded) return [] as S[];
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
      return Array.from(vars).filter(Boolean);
    };
    const qVars = new Set(generarVariantes(qRaw));
    const qDigits = qRaw.replace(/\D+/g, '');
    const qPref11 = qDigits.length >= 5 ? qDigits.slice(0, Math.min(11, qDigits.length)) : '';
    const match = (num: string, nombre?: string) => {
      const numVars = new Set(generarVariantes(num));
      for (const v of numVars) { if (qVars.has(v)) return true; }
      if (qPref11) {
        const digits = num.replace(/\D+/g, '');
        if (digits.startsWith(qPref11)) return true;
      }
      if (nombre) {
        const n = String(nombre).toLowerCase();
        if (n.includes(qRaw.toLowerCase())) return true;
      }
      // Partial containment ignoring dashes
      const numFlat = num.toLowerCase().replace(/-/g, '');
      const qFlat = qRaw.toLowerCase().replace(/-/g, '');
      if (qFlat.length >= 4 && numFlat.includes(qFlat)) return true;
      return false;
    };

    const carteles = dataManager.obtenerDatos('DetalleCarteles') as any[];
    const candidates = carteles.filter(c => match(String(c.numeroCartel || ''), String(c.nombreCartel || c.descripcionCartel || '')));
    const ranked = candidates.sort((a, b) => {
      const aNum = String(a.numeroCartel || '');
      const bNum = String(b.numeroCartel || '');
      // Prefer longer exact/prefix matches
      const score = (num: string) => {
        const digits = num.replace(/\D+/g, '');
        let s = 0;
        if (qPref11 && digits.startsWith(qPref11)) s += qPref11.length * 2;
        if (generarVariantes(num).some(v => qVars.has(v))) s += 50;
        s += Math.min(digits.length, 20);
        return s;
      };
      return score(bNum) - score(aNum);
    });

    return ranked.slice(0, limit).map(c => ({ numeroCartel: c.numeroCartel, nombreCartel: c.nombreCartel, codigoInstitucion: c.codigoInstitucion }));
  };

  // ================================
  // UTILIDADES
  // ================================

  const limpiarError = (): void => {
    setError(null);
  };

  const obtenerDatos = (tabla: string): any[] => {
    if (!isLoaded) return [];
    return dataManager.obtenerDatos(tabla);
  };

  // ================================
  // VALOR DEL CONTEXTO
  // ================================

  const contextValue: SicopContextValue = {
    // Estado
    isLoaded,
    isLoading,
    loadingProgress,
  loadingStage,
    error,

    // Datos
    estadisticasGenerales,
    instituciones,
    proveedores,
    keywordsComunes,

    // Métricas avanzadas
    metricasAvanzadas,
    alertasActivas,

    // Métodos principales
    cargarDatos,
    buscarOportunidades,
    analizarCompetencia,
    generarReporte,

    // Filtros especializados
    buscarNichosPocaCompetencia,
    analizarPatronesInstitucion,
    analizarEstacionalidad,
  buscarCartelPorNumero,
  sugerirCarteles,

    // Métricas y análisis
    actualizarMetricas,
    obtenerTendenciasTempo,

    // Utilidades
    limpiarError,
    obtenerDatos
  };

  return (
    <SicopContext.Provider value={contextValue}>
      {children}
    </SicopContext.Provider>
  );
};

// ================================
// HOOK PERSONALIZADO
// ================================

export const useSicop = (): SicopContextValue => {
  const context = useContext(SicopContext);
  
  if (context === undefined) {
    throw new Error('useSicop debe ser usado dentro de un SicopProvider');
  }
  
  return context;
};

// ================================
// HOOK PARA CARGAR DATOS AUTOMÁTICAMENTE
// ================================

export const useSicopAutoLoad = (autoLoad: boolean = true): SicopContextValue => {
  const sicop = useSicop();
  
  useEffect(() => {
    if (autoLoad && !sicop.isLoaded && !sicop.isLoading) {
      sicop.cargarDatos().catch(err => {
        console.error('Error en carga automática:', err);
      });
    }
  }, [autoLoad, sicop.isLoaded, sicop.isLoading, sicop]);
  
  return sicop;
};
