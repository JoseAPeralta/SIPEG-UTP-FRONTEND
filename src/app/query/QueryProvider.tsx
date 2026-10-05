import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useState, type ReactNode } from "react";

import { createQueryClient } from "./queryClient";
import { resolveQueryPersistence } from "./queryPersistenceConfig";

const PersistentQueryProvider = lazy(() =>
  import("./PersistentQueryProvider").then(({ PersistentQueryProvider: Component }) => ({
    default: Component,
  })),
);

export type QueryProviderProps = {
  children: ReactNode;
  client?: QueryClient | undefined;
  persist?: boolean | undefined;
};

export function QueryProvider({
  children,
  client,
  persist = resolveQueryPersistence(),
}: QueryProviderProps) {
  const [queryClient] = useState(() => client ?? createQueryClient());
  if (persist) {
    return (
      <Suspense fallback={null}>
        <PersistentQueryProvider client={queryClient}>{children}</PersistentQueryProvider>
      </Suspense>
    );
  }

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
