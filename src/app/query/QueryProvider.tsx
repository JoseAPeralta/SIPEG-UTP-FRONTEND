import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useState, type ReactNode } from "react";

import { createQueryClient } from "./queryClient";
import {
  createPersistenceOptions,
  createQueryPersister,
  resolveQueryPersistence,
} from "./queryPersistence";

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
  const [persistOptions] = useState(() =>
    persist ? createPersistenceOptions(createQueryPersister()) : null,
  );

  if (persistOptions) {
    return (
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        {children}
      </PersistQueryClientProvider>
    );
  }

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
