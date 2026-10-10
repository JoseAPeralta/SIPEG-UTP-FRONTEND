import type { QueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { AppAdaptersProvider, createAppAdapters, type AppAdapters } from "@/app/adapters";
import { QueryProvider, createQueryClient } from "@/app/query";

export type ActivityStoryProvidersProps = {
  adapters?: AppAdapters | undefined;
  children: ReactNode;
  configure?: ((adapters: AppAdapters) => void) | undefined;
  queryClient?: QueryClient | undefined;
};

/**
 * Cada story de actividades recibe su propia composicion mock y su cliente Query, de modo que
 * crear o editar una actividad en una story no altera el registro que otra story lee.
 */
export function ActivityStoryProviders({
  adapters: providedAdapters,
  children,
  configure,
  queryClient,
}: ActivityStoryProvidersProps) {
  const [adapters] = useState(() => {
    const composed = providedAdapters ?? createAppAdapters({ source: "mock" });
    configure?.(composed);
    return composed;
  });
  const [client] = useState(
    () => queryClient ?? createQueryClient({ defaultOptions: { queries: { retry: false } } }),
  );

  return (
    <AppAdaptersProvider adapters={adapters}>
      <QueryProvider client={client}>{children}</QueryProvider>
    </AppAdaptersProvider>
  );
}
