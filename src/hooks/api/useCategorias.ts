/**
 * SICOP Analytics - Hook de React Query para GET /v1/dashboard/categorias.
 */
import { useQuery } from '@tanstack/react-query';
import { obtenerCategorias } from '../../api/endpoints';
import type { RangoPeriodo } from '../../api/tipos';
import { clavesQuery } from './clavesQuery';
import { GC_TIME_MS, STALE_TIME_MS } from './configuracionQuery';

export function useCategorias(rango?: RangoPeriodo & { limite?: number }) {
  return useQuery({
    queryKey: clavesQuery.categorias(rango),
    queryFn: ({ signal }) => obtenerCategorias(rango, signal),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}
