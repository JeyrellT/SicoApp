/**
 * SICOP Analytics - Hook de React Query para GET /v1/procedimientos (paginado).
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { obtenerProcedimientos } from '../../api/endpoints';
import type { ParametrosProcedimientos } from '../../api/tipos';
import { clavesQuery } from './clavesQuery';
import { GC_TIME_MS, STALE_TIME_MS } from './configuracionQuery';

export function useProcedimientos(params?: ParametrosProcedimientos) {
  return useQuery({
    queryKey: clavesQuery.procedimientos(params),
    queryFn: ({ signal }) => obtenerProcedimientos(params, signal),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    placeholderData: keepPreviousData,
  });
}
