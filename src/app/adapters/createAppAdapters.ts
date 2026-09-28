import type { AppAdapters } from "./contracts";
import {
  createApiActivityCatalogAdapter,
  type ApiActivityCatalogAdapterOptions,
} from "@/features/activity-catalog/adapters/apiActivityCatalogAdapter";
import { createMockActivityCatalogAdapter } from "@/features/activity-catalog/adapters/mockActivityCatalogAdapter";
import { createApiAuthAdapter } from "@/features/auth/adapters/apiAuthAdapter";
import { createMockAuthAdapter } from "@/features/auth/adapters/mockAuthAdapter";
import { createMockOperationsAdapter } from "@/features/operations/adapters/mockOperationsAdapter";
import { createUnavailableOperationsAdapter } from "@/features/operations/adapters/unavailableOperationsAdapter";
import {
  createApiRegistrationAdapter,
  createMockRegistrationAdapter,
} from "@/features/registration/adapters";
import { useSessionStore } from "@/store/session";

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

function readSessionAccessToken(): string | null {
  return useSessionStore.getState().tokens?.accessToken ?? null;
}

export function createAppAdapters({
  apiOptions = {},
  source = resolveDataSource(),
}: CreateAppAdaptersOptions = {}): AppAdapters {
  if (source === "api") {
    return {
      activityCatalog: createApiActivityCatalogAdapter(
        {
          ...apiOptions,
        },
        readSessionAccessToken,
      ),
      auth: createApiAuthAdapter(apiOptions),
      operations: createUnavailableOperationsAdapter(),
      registration: createApiRegistrationAdapter(apiOptions),
    };
  }

  return {
    activityCatalog: createMockActivityCatalogAdapter(),
    auth: createMockAuthAdapter(),
    operations: createMockOperationsAdapter(),
    registration: createMockRegistrationAdapter(),
  };
}
