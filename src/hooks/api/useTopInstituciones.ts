/**
 * SICOP Analytics - Hook de React Query para GET /v1/dashboard/top-instituciones.
 */
import { useQuery } from '@tanstack/react-query';
import { obtenerTopInstituciones } from '../../api/endpoints';
import type { RangoPeriodo } from '../../api/tipos';
import { clavesQuery } from './clavesQuery';
import { GC_TIME_MS, STALE_TIME_MS } from './configuracionQuery';

export function useTopInstituciones(rango?: RangoPeriodo & { limite?: number }) {
  return useQuery({
    queryKey: clavesQuery.topInstituciones(rango),
    queryFn: ({ signal }) => obtenerTopInstituciones(rango, signal),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}
