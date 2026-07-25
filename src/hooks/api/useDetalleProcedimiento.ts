/**
 * SICOP Analytics - Hook de React Query para GET /v1/procedimientos/{nro_sicop}.
 * Requiere que el perfil del usuario tenga el permiso 'detalle'; si no lo
 * tiene, el backend responde 403 (ver ApiError.esPermisoDenegado()).
 */
import { useQuery } from '@tanstack/react-query';
import { obtenerDetalleProcedimiento } from '../../api/endpoints';
import { clavesQuery } from './clavesQuery';
import { GC_TIME_MS, STALE_TIME_MS } from './configuracionQuery';

export function useDetalleProcedimiento(nroSicop: string | undefined, habilitado = true) {
  return useQuery({
    queryKey: clavesQuery.detalleProcedimiento(nroSicop ?? ''),
    queryFn: ({ signal }) => obtenerDetalleProcedimiento(nroSicop as string, signal),
    enabled: Boolean(nroSicop) && habilitado,
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}
