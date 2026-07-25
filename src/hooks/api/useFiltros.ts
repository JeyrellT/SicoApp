/**
 * SICOP Analytics - Hook de React Query para GET /v1/dashboard/filtros.
 */
import { useQuery } from '@tanstack/react-query';
import { obtenerFiltrosDashboard } from '../../api/endpoints';
import { clavesQuery } from './clavesQuery';
import { GC_TIME_MS, STALE_TIME_MS } from './configuracionQuery';

export function useFiltros() {
  return useQuery({
    queryKey: clavesQuery.filtros(),
    queryFn: ({ signal }) => obtenerFiltrosDashboard(signal),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}
