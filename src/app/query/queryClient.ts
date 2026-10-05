import { QueryClient, type QueryClientConfig } from "@tanstack/react-query";

import { ApiError } from "@/app/adapters/http/apiClient";

export const QUERY_STALE_TIME_MS = 30_000;
export const QUERY_GC_TIME_MS = 5 * 60_000;
export const QUERY_MAX_RETRIES = 1;

/**
 * Vigencia de la agenda publica.
 *
 * Excepcion deliberada a los 30 s por defecto. La agenda cambia pocas veces al
 * dia, asi que treinta segundos solo garantizan revalidez constante; y con el
 * `refetchOnWindowFocus` activo, cada vuelta a la pestana volveria a descargar
 * la agenda entera. Dos minutos acceptan que una actividad recien publicada tarde
 * ese tiempo en aparecer a la primera carga.
 */
export const PUBLIC_CATALOG_STALE_TIME_MS = 2 * 60_000;

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false;
  }

  return failureCount < QUERY_MAX_RETRIES;
}

export function createQueryClient(config: QueryClientConfig = {}): QueryClient {
  return new QueryClient({
    ...config,
    defaultOptions: {
      ...config.defaultOptions,
      queries: {
        gcTime: QUERY_GC_TIME_MS,
        refetchOnWindowFocus: true,
        retry: shouldRetryQuery,
        staleTime: QUERY_STALE_TIME_MS,
        ...config.defaultOptions?.queries,
      },
    },
  });
}
