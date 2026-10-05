import { useState, type ReactNode } from "react";
import { AppAdaptersProvider } from "@/app/adapters";
import { QueryProvider, createQueryClient } from "@/app/query";
import { scenarioAdapters, type CollaborationScenario } from "./collaborationStories";

/** Cada montaje conserva su cliente y escenario mutable; no comparte estado entre stories. */
export function CollaborationStoryProviders({
  children,
  scenario,
}: {
  children: ReactNode;
  scenario: CollaborationScenario;
}) {
  const [adapters] = useState(() => scenarioAdapters(scenario));
  const [client] = useState(() =>
    createQueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return (
    <AppAdaptersProvider adapters={adapters}>
      <QueryProvider client={client}>{children}</QueryProvider>
    </AppAdaptersProvider>
  );
}
