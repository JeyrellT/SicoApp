/**
 * SICOP Analytics - Hook de React Query para GET /v1/dashboard/resumen.
 */
import { useQuery } from '@tanstack/react-query';
import { obtenerResumen } from '../../api/endpoints';
import type { RangoPeriodo } from '../../api/tipos';
import { clavesQuery } from './clavesQuery';
import { GC_TIME_MS, STALE_TIME_MS } from './configuracionQuery';

export function useResumen(rango?: RangoPeriodo) {
  return useQuery({
    queryKey: clavesQuery.resumen(rango),
    queryFn: ({ signal }) => obtenerResumen(rango, signal),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}
