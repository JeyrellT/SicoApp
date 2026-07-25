/**
 * SICOP Analytics - Hook de React Query para GET /v1/dashboard/serie.
 */
import { useQuery } from '@tanstack/react-query';
import { obtenerSerie } from '../../api/endpoints';
import type { RangoPeriodo } from '../../api/tipos';
import { clavesQuery } from './clavesQuery';
import { GC_TIME_MS, STALE_TIME_MS } from './configuracionQuery';

export function useSerie(rango?: RangoPeriodo) {
  return useQuery({
    queryKey: clavesQuery.serie(rango),
    queryFn: ({ signal }) => obtenerSerie(rango, signal),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}
