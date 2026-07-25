/**
 * SICOP Analytics - Hooks de React Query para GET/PUT /v1/auth/preferencias.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { guardarPreferencias, obtenerPreferencias } from '../../api/endpoints';
import type { Preferencias } from '../../api/tipos';
import { clavesQuery } from './clavesQuery';
import { GC_TIME_MS, STALE_TIME_MS } from './configuracionQuery';

export function usePreferencias() {
  return useQuery({
    queryKey: clavesQuery.preferencias(),
    queryFn: ({ signal }) => obtenerPreferencias(signal),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}

export function useGuardarPreferencias() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferencias: Preferencias) => guardarPreferencias(preferencias),
    onSuccess: (datos) => {
      queryClient.setQueryData(clavesQuery.preferencias(), datos);
    },
  });
}
