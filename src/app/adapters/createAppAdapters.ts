import type { AppAdapters } from "./contracts";
import {
  createApiActivityCatalogAdapter,
  type ApiActivityCatalogAdapterOptions,
} from "@/features/activity-catalog/adapters/apiActivityCatalogAdapter";
import { createMockActivityCatalogAdapter } from "@/features/activity-catalog/adapters/mockActivityCatalogAdapter";
import { createApiPublicActivityCatalogAdapter } from "@/features/activity-catalog/adapters/apiPublicActivityCatalogAdapter";
import { createMockPublicActivityCatalogAdapter } from "@/features/activity-catalog/adapters/mockPublicActivityCatalogAdapter";
import { createApiAuthAdapter } from "@/features/auth/adapters/apiAuthAdapter";
import { createMockAuthAdapter } from "@/features/auth/adapters/mockAuthAdapter";
import { createApiCareersAdapter } from "@/features/careers/adapters/apiCareersAdapter";
import { createMockCareersAdapter } from "@/features/careers/adapters/mockCareersAdapter";
import { createApiClassroomsAdapter } from "@/features/classrooms/adapters/apiClassroomsAdapter";
import { createMockClassroomsAdapter } from "@/features/classrooms/adapters/mockClassroomsAdapter";
import { createMockOperationsAdapter } from "@/features/operations/adapters/mockOperationsAdapter";
import { createUnavailableOperationsAdapter } from "@/features/operations/adapters/unavailableOperationsAdapter";
import { createApiOrganizationalUnitsAdapter } from "@/features/organizational-units/adapters/apiOrganizationalUnitsAdapter";
import { createMockOrganizationalUnitsAdapter } from "@/features/organizational-units/adapters/mockOrganizationalUnitsAdapter";
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
      careers: createApiCareersAdapter(apiOptions),
      classrooms: createApiClassroomsAdapter(apiOptions),
      organizationalUnits: createApiOrganizationalUnitsAdapter(apiOptions),
      operations: createUnavailableOperationsAdapter(),
      publicActivityCatalog: createApiPublicActivityCatalogAdapter(apiOptions),
      registration: createApiRegistrationAdapter(apiOptions),
    };
  }

  return {
    activityCatalog: createMockActivityCatalogAdapter(),
    auth: createMockAuthAdapter(),
    careers: createMockCareersAdapter(),
    classrooms: createMockClassroomsAdapter(),
    organizationalUnits: createMockOrganizationalUnitsAdapter(),
    operations: createMockOperationsAdapter(),
    publicActivityCatalog: createMockPublicActivityCatalogAdapter(),
    registration: createMockRegistrationAdapter(),
  };
}
