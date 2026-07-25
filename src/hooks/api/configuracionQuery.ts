/**
 * SICOP Analytics - Configuración compartida de staleTime/gcTime para los
 * hooks de lectura. Los datos del backend se recalculan una vez al día
 * (carga ETL), por lo que 30 minutos de frescura es un margen amplio y
 * seguro sin recargar al usuario con refetch innecesario.
 */
export const STALE_TIME_MS = 30 * 60 * 1000;
export const GC_TIME_MS = 60 * 60 * 1000;
