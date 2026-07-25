/**
 * SICOP Analytics - Hook de React Query para GET /v1/instituciones/{cedula}/perfil.
 */
import { useQuery } from '@tanstack/react-query';
import { obtenerPerfilInstitucion } from '../../api/endpoints';
import type { ParametrosPerfilEntidad } from '../../api/tipos';
import { clavesQuery } from './clavesQuery';
import { GC_TIME_MS, STALE_TIME_MS } from './configuracionQuery';

export function usePerfilInstitucion(
  cedula: string | undefined,
  params?: ParametrosPerfilEntidad
) {
  return useQuery({
    queryKey: clavesQuery.perfilInstitucion(cedula ?? '', params),
    queryFn: ({ signal }) => obtenerPerfilInstitucion(cedula as string, params, signal),
    enabled: Boolean(cedula),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}
