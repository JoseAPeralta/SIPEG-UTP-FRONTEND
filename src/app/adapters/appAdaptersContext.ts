import { createContext, useContext } from "react";

import type { AppAdapters } from "./contracts";

export const AppAdaptersContext = createContext<AppAdapters | null>(null);

export function useAppAdapters() {
  const adapters = useContext(AppAdaptersContext);

  if (!adapters) {
    throw new Error("useAppAdapters debe usarse dentro de AppAdaptersProvider");
  }

  return adapters;
}
