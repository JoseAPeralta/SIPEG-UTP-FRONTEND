import { useState, type ReactNode } from "react";
import { AppAdaptersProvider, createAppAdapters } from "@/app/adapters";
import { QueryProvider, createQueryClient } from "@/app/query";

/**
 * Cada story de programas recibe su propia composicion mock y su cliente Query, de modo que crear,
 * editar o archivar en una story no altera el registro que otra story lee.
 */
export function EventProgramsStoryProviders({ children }: { children: ReactNode }) {
  const [adapters] = useState(() => createAppAdapters({ source: "mock" }));
  const [client] = useState(() =>
    createQueryClient({ defaultOptions: { queries: { retry: false } } }),
  );

  return (
    <AppAdaptersProvider adapters={adapters}>
      <QueryProvider client={client}>{children}</QueryProvider>
    </AppAdaptersProvider>
  );
}
