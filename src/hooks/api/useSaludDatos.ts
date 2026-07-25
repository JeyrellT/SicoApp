/**
 * SICOP Analytics - Hook de React Query para GET /salud/datos.
 * Endpoint público: no requiere sesión.
 */
import { useQuery } from '@tanstack/react-query';
import { obtenerSaludDatos } from '../../api/endpoints';
import { clavesQuery } from './clavesQuery';
import { GC_TIME_MS, STALE_TIME_MS } from './configuracionQuery';

export function useSaludDatos() {
  return useQuery({
    queryKey: clavesQuery.saludDatos(),
    queryFn: ({ signal }) => obtenerSaludDatos(signal),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}
