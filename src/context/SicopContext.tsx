// ================================
// CONTEXTO GLOBAL SICOP - BASADO EN LA API
// ================================
// Ya no lee IndexedDB ni mantiene un DataManager en memoria: todo el estado
// que expone se deriva de los hooks de React Query sobre la API del backend
// (src/hooks/api). Provee el rango de periodos disponible, el filtro global
// de periodo seleccionado por el usuario y un par de banderas de
// compatibilidad (isLoaded/error) derivadas de GET /salud/datos.

import React, { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import { useFiltros, useSaludDatos } from '../hooks/api';
import type { RangoPeriodo } from '../api/tipos';

// ================================
// INTERFAZ DEL CONTEXTO
// ================================

interface SicopContextValue {
  // Catálogo de periodos/filtros disponibles (GET /v1/dashboard/filtros)
  periodos: number[];
  periodoMin: number | null;
  periodoMax: number | null;
  anios: number[];
  tiposProcedimiento: string[];
  objetosGasto: string[];
  monedas: string[];
  cargandoFiltros: boolean;

  // Filtro global de periodo (desde/hasta yyyymm) seleccionado por el usuario.
  // Los componentes que consulten la API pueden leerlo y pasarlo a sus hooks.
  filtroGlobal: RangoPeriodo;
  setFiltroGlobal: (rango: RangoPeriodo) => void;
  limpiarFiltroGlobal: () => void;

  /**
   * Compatibilidad: `true` cuando el backend reporta datos disponibles
   * (GET /salud/datos). Se mantiene con este nombre porque ModernDashboard,
   * InstitucionesDashboard y FiltersPanel todavía lo consumen (están siendo
   * reconectados a la API en paralelo); antes indicaba que el DataManager en
   * memoria tenía datos cargados, ahora se deriva 100% del backend.
   */
  isLoaded: boolean;
  /** Compatibilidad: mensaje de error si GET /salud/datos falla. */
  error: string | null;
}

const SicopContext = createContext<SicopContextValue | undefined>(undefined);

// ================================
// PROVEEDOR DEL CONTEXTO
// ================================

interface SicopProviderProps {
  children: ReactNode;
}

export const SicopProvider: React.FC<SicopProviderProps> = ({ children }) => {
  const { data: filtros, isLoading: cargandoFiltros } = useFiltros();
  const { data: saludDatos, error: errorSalud } = useSaludDatos();

  const [filtroGlobal, setFiltroGlobalState] = useState<RangoPeriodo>({});

  const setFiltroGlobal = useCallback((rango: RangoPeriodo) => {
    setFiltroGlobalState(rango);
  }, []);

  const limpiarFiltroGlobal = useCallback(() => {
    setFiltroGlobalState({});
  }, []);

  const contextValue = useMemo<SicopContextValue>(() => {
    const periodos = filtros?.periodos ?? [];
    return {
      periodos,
      periodoMin: periodos.length ? Math.min(...periodos) : null,
      periodoMax: periodos.length ? Math.max(...periodos) : null,
      anios: filtros?.anios ?? [],
      tiposProcedimiento: filtros?.tipos_procedimiento ?? [],
      objetosGasto: filtros?.objetos_gasto ?? [],
      monedas: filtros?.monedas ?? [],
      cargandoFiltros,
      filtroGlobal,
      setFiltroGlobal,
      limpiarFiltroGlobal,
      isLoaded: Boolean(saludDatos && saludDatos.filas_totales > 0),
      error: errorSalud instanceof Error ? errorSalud.message : null,
    };
  }, [filtros, cargandoFiltros, filtroGlobal, setFiltroGlobal, limpiarFiltroGlobal, saludDatos, errorSalud]);

  return <SicopContext.Provider value={contextValue}>{children}</SicopContext.Provider>;
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
