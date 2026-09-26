import type { AppAdapters } from "./contracts";
import {
  createApiActivityCatalogAdapter,
  type ApiActivityCatalogAdapterOptions,
} from "@/features/activity-catalog/adapters/apiActivityCatalogAdapter";
import { createMockActivityCatalogAdapter } from "@/features/activity-catalog/adapters/mockActivityCatalogAdapter";
import { createMockOperationsAdapter } from "@/features/operations/adapters/mockOperationsAdapter";
import { createUnavailableOperationsAdapter } from "@/features/operations/adapters/unavailableOperationsAdapter";

export type DataSource = "mock" | "api";

export type CreateAppAdaptersOptions = {
  apiOptions?: ApiActivityCatalogAdapterOptions;
  source?: DataSource;
};

export function resolveDataSource(
  environment: Record<string, unknown> = import.meta.env,
): DataSource {
  return environment["VITE_DATA_SOURCE"] === "mock" ? "mock" : "api";
}

export function createAppAdapters({
  apiOptions = {},
  source = resolveDataSource(),
}: CreateAppAdaptersOptions = {}): AppAdapters {
  if (source === "api") {
    return {
      activityCatalog: createApiActivityCatalogAdapter(apiOptions),
      operations: createUnavailableOperationsAdapter(),
    };
  }

  return {
    activityCatalog: createMockActivityCatalogAdapter(),
    operations: createMockOperationsAdapter(),
  };
}
