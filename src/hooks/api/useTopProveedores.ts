/**
 * SICOP Analytics - Hook de React Query para GET /v1/dashboard/top-proveedores.
 */
import { useQuery } from '@tanstack/react-query';
import { obtenerTopProveedores } from '../../api/endpoints';
import type { RangoPeriodo } from '../../api/tipos';
import { clavesQuery } from './clavesQuery';
import { GC_TIME_MS, STALE_TIME_MS } from './configuracionQuery';

export function useTopProveedores(rango?: RangoPeriodo & { limite?: number }) {
  return useQuery({
    queryKey: clavesQuery.topProveedores(rango),
    queryFn: ({ signal }) => obtenerTopProveedores(rango, signal),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}
