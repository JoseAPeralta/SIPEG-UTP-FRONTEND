import type { ReactNode } from "react";

import { AppAdaptersContext } from "./appAdaptersContext";
import type { AppAdapters } from "./contracts";

export function AppAdaptersProvider({
  adapters,
  children,
}: {
  adapters: AppAdapters;
  children: ReactNode;
}) {
  return <AppAdaptersContext.Provider value={adapters}>{children}</AppAdaptersContext.Provider>;
}
