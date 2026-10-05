import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useState, type ReactNode } from "react";
import type { QueryClient } from "@tanstack/react-query";

import { createPersistenceOptions, createQueryPersister } from "./queryPersistence";

export function PersistentQueryProvider({
  children,
  client,
}: {
  children: ReactNode;
  client: QueryClient;
}) {
  const [persistOptions] = useState(() => createPersistenceOptions(createQueryPersister()));

  return (
    <PersistQueryClientProvider client={client} persistOptions={persistOptions}>
      {children}
    </PersistQueryClientProvider>
  );
}
