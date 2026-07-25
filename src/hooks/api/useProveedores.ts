/**
 * SICOP Analytics - Hook de React Query para GET /v1/catalogo/proveedores (paginado).
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { obtenerProveedores } from '../../api/endpoints';
import type { ParametrosCatalogo } from '../../api/tipos';
import { clavesQuery } from './clavesQuery';
import { GC_TIME_MS, STALE_TIME_MS } from './configuracionQuery';

export function useProveedores(params?: ParametrosCatalogo) {
  return useQuery({
    queryKey: clavesQuery.proveedores(params),
    queryFn: ({ signal }) => obtenerProveedores(params, signal),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    placeholderData: keepPreviousData,
  });
}
