/**
 * SICOP Analytics - Hook de React Query para GET /v1/dashboard/tipos-procedimiento.
 */
import { useQuery } from '@tanstack/react-query';
import { obtenerTiposProcedimiento } from '../../api/endpoints';
import type { RangoPeriodo } from '../../api/tipos';
import { clavesQuery } from './clavesQuery';
import { GC_TIME_MS, STALE_TIME_MS } from './configuracionQuery';

export function useTiposProcedimiento(rango?: RangoPeriodo) {
  return useQuery({
    queryKey: clavesQuery.tiposProcedimiento(rango),
    queryFn: ({ signal }) => obtenerTiposProcedimiento(rango, signal),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}
