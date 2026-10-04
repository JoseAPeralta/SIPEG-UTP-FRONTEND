import type { ApiClientOptions } from "./http/apiClient";
import type { AppAdapters } from "./contracts";
import { resolveDataSource, type DataSource } from "./dataSource";
import { createDeferredAdapter } from "./deferredAdapter";
import { useSessionStore } from "@/store/session";

export type CreateBrowserAppAdaptersOptions = {
  apiOptions?: Pick<ApiClientOptions, "environment" | "fetcher">;
  source?: DataSource;
};

function readSessionAccessToken(): string | null {
  return useSessionStore.getState().tokens?.accessToken ?? null;
}

/**
 * Browser composition root. Each feature implementation remains outside the
 * initial graph until one of its port methods is used.
 */
export function createBrowserAppAdapters({
  apiOptions = {},
  source = resolveDataSource(),
}: CreateBrowserAppAdaptersOptions = {}): AppAdapters {
  const isApi = source === "api";

  return {
    activityCatalog: createDeferredAdapter(async () =>
      isApi
        ? import("@/features/activity-catalog/adapters/apiActivityCatalogAdapter").then(
            ({ createApiActivityCatalogAdapter }) =>
              createApiActivityCatalogAdapter(apiOptions, readSessionAccessToken),
          )
        : import("@/features/activity-catalog/adapters/mockActivityCatalogAdapter").then(
            ({ createMockActivityCatalogAdapter }) => createMockActivityCatalogAdapter(),
          ),
    ),
    auth: createDeferredAdapter(async () =>
      isApi
        ? import("@/features/auth/adapters/apiAuthAdapter").then(({ createApiAuthAdapter }) =>
            createApiAuthAdapter(apiOptions),
          )
        : import("@/features/auth/adapters/mockAuthAdapter").then(({ createMockAuthAdapter }) =>
            createMockAuthAdapter(),
          ),
    ),
    careers: createDeferredAdapter(async () =>
      isApi
        ? import("@/features/careers/adapters/apiCareersAdapter").then(
            ({ createApiCareersAdapter }) => createApiCareersAdapter(apiOptions),
          )
        : import("@/features/careers/adapters/mockCareersAdapter").then(
            ({ createMockCareersAdapter }) => createMockCareersAdapter(),
          ),
    ),
    classrooms: createDeferredAdapter(async () =>
      isApi
        ? import("@/features/classrooms/adapters/apiClassroomsAdapter").then(
            ({ createApiClassroomsAdapter }) =>
              createApiClassroomsAdapter(apiOptions, readSessionAccessToken),
          )
        : import("@/features/classrooms/adapters/mockClassroomsAdapter").then(
            ({ createMockClassroomsAdapter }) => createMockClassroomsAdapter(),
          ),
    ),
    operations: createDeferredAdapter(async () =>
      isApi
        ? import("@/features/operations/adapters/unavailableOperationsAdapter").then(
            ({ createUnavailableOperationsAdapter }) => createUnavailableOperationsAdapter(),
          )
        : import("@/features/operations/adapters/mockOperationsAdapter").then(
            ({ createMockOperationsAdapter }) => createMockOperationsAdapter(),
          ),
    ),
    organizationalUnits: createDeferredAdapter(async () =>
      isApi
        ? import("@/features/organizational-units/adapters/apiOrganizationalUnitsAdapter").then(
            ({ createApiOrganizationalUnitsAdapter }) =>
              createApiOrganizationalUnitsAdapter(apiOptions, readSessionAccessToken),
          )
        : import("@/features/organizational-units/adapters/mockOrganizationalUnitsAdapter").then(
            ({ createMockOrganizationalUnitsAdapter }) => createMockOrganizationalUnitsAdapter(),
          ),
    ),
    publicActivityCatalog: createDeferredAdapter(async () =>
      isApi
        ? import("@/features/activity-catalog/adapters/apiPublicActivityCatalogAdapter").then(
            ({ createApiPublicActivityCatalogAdapter }) =>
              createApiPublicActivityCatalogAdapter(apiOptions),
          )
        : import("@/features/activity-catalog/adapters/mockPublicActivityCatalogAdapter").then(
            ({ createMockPublicActivityCatalogAdapter }) =>
              createMockPublicActivityCatalogAdapter(),
          ),
    ),
    registration: createDeferredAdapter(async () =>
      isApi
        ? import("@/features/registration/adapters/apiRegistrationAdapter").then(
            ({ createApiRegistrationAdapter }) => createApiRegistrationAdapter(apiOptions),
          )
        : import("@/features/registration/adapters/mockRegistrationAdapter").then(
            ({ createMockRegistrationAdapter }) => createMockRegistrationAdapter(),
          ),
    ),
  };
}
