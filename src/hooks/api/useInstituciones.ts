/**
 * SICOP Analytics - Hook de React Query para GET /v1/catalogo/instituciones (paginado).
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { obtenerInstituciones } from '../../api/endpoints';
import type { ParametrosCatalogo } from '../../api/tipos';
import { clavesQuery } from './clavesQuery';
import { GC_TIME_MS, STALE_TIME_MS } from './configuracionQuery';

export function useInstituciones(params?: ParametrosCatalogo) {
  return useQuery({
    queryKey: clavesQuery.instituciones(params),
    queryFn: ({ signal }) => obtenerInstituciones(params, signal),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    // Evita el parpadeo de la tabla al cambiar de página.
    placeholderData: keepPreviousData,
  });
}
