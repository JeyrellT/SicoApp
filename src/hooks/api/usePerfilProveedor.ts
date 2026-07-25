/**
 * SICOP Analytics - Hook de React Query para GET /v1/proveedores/{cedula}/perfil.
 */
import { useQuery } from '@tanstack/react-query';
import { obtenerPerfilProveedor } from '../../api/endpoints';
import type { ParametrosPerfilEntidad } from '../../api/tipos';
import { clavesQuery } from './clavesQuery';
import { GC_TIME_MS, STALE_TIME_MS } from './configuracionQuery';

export function usePerfilProveedor(cedula: string | undefined, params?: ParametrosPerfilEntidad) {
  return useQuery({
    queryKey: clavesQuery.perfilProveedor(cedula ?? '', params),
    queryFn: ({ signal }) => obtenerPerfilProveedor(cedula as string, params, signal),
    enabled: Boolean(cedula),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}
