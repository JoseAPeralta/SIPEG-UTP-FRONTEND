import type { ActivityCatalogAdapter, EventProgramsAdapter } from "@/app/adapters/contracts";
import { activities } from "@/data/mock/activities";

import { toActivitySummary } from "../model/activitySummary";

import type { MockActivityRegistry } from "./mockActivityRegistry";

export type MockActivityCatalogAdapterOptions = {
  /** Registro compartido: el catalogo refleja las actividades creadas o editadas en runtime. */
  registry?: MockActivityRegistry;
};

export function createMockActivityCatalogAdapter(
  programs: EventProgramsAdapter,
  { registry }: MockActivityCatalogAdapterOptions = {},
): ActivityCatalogAdapter {
  return {
    async loadCatalog(mode = "active-programs") {
      const eventPrograms =
        mode === "all-programs"
          ? await programs.loadEventPrograms("administrative", "ALL")
          : await programs.loadEventPrograms("administrative");
      const ids = new Set(eventPrograms.map((program) => program.id));
      const source = registry ? [...registry.values()] : activities;

      return {
        activities: source
          .filter((activity) => ids.has(activity.eventProgramId))
          .map((activity) => toActivitySummary(activity)),
        eventPrograms,
      };
    },
  };
}
