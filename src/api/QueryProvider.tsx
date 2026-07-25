/**
 * SICOP Analytics - Proveedor de React Query.
 *
 * Configuración centralizada del QueryClient. Los datos del backend se
 * recalculan una vez al día (carga ETL diaria), por lo que un staleTime
 * largo evita refetch innecesario.
 *
 * @copyright 2025 Saenz Fallas S.A. - Todos los derechos reservados
 */

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const TREINTA_MINUTOS_MS = 30 * 60 * 1000;
const UNA_HORA_MS = 60 * 60 * 1000;

function crearQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: TREINTA_MINUTOS_MS,
        gcTime: UNA_HORA_MS,
      },
    },
  });
}

export const QueryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // useState con inicializador perezoso: el QueryClient se crea una sola vez
  // por instancia del componente, no en cada render.
  const [queryClient] = useState(crearQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
