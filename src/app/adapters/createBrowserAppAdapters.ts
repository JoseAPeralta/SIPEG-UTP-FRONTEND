import type { ApiClientOptions } from "./http/apiClient";
import type { AppAdapters } from "./contracts";
import { resolveDataSource, type DataSource } from "./dataSource";
import { createDeferredAdapter } from "./deferredAdapter";
import type { MockActivityRegistry } from "@/features/activity-catalog/adapters/mockActivityRegistry";
import type { MockEventProgramRegistry } from "@/features/event-programs/adapters/mockEventProgramsAdapter";
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
  let mockActivityRegistryPromise: Promise<MockActivityRegistry> | undefined;
  const getMockActivityRegistry = () =>
    (mockActivityRegistryPromise ??=
      import("@/features/activity-catalog/adapters/mockActivityRegistry").then((module) =>
        module.createMockActivityRegistry(),
      ));
  let mockProgramRegistryPromise: Promise<MockEventProgramRegistry> | undefined;
  const getMockProgramRegistry = () =>
    (mockProgramRegistryPromise ??=
      import("@/features/event-programs/adapters/mockEventProgramsAdapter").then((module) =>
        module.createMockEventProgramRegistry(),
      ));
  const organizationalUnits = createDeferredAdapter<AppAdapters["organizationalUnits"]>(async () =>
    isApi
      ? import("@/features/organizational-units/adapters/apiOrganizationalUnitsAdapter").then(
          ({ createApiOrganizationalUnitsAdapter }) =>
            createApiOrganizationalUnitsAdapter(apiOptions, readSessionAccessToken),
        )
      : import("@/features/organizational-units/adapters/mockOrganizationalUnitsAdapter").then(
          ({ createMockOrganizationalUnitsAdapter }) => createMockOrganizationalUnitsAdapter(),
        ),
  );
  const eventPrograms = createDeferredAdapter<AppAdapters["eventPrograms"]>(async () =>
    isApi
      ? import("@/features/event-programs/adapters/apiEventProgramsAdapter").then(
          ({ createApiEventProgramsAdapter }) =>
            createApiEventProgramsAdapter(apiOptions, readSessionAccessToken),
        )
      : getMockProgramRegistry().then((registry) =>
          import("@/features/event-programs/adapters/mockEventProgramsAdapter").then(
            ({ createMockEventProgramsAdapter }) =>
              createMockEventProgramsAdapter({
                readGlobalRole: () => useSessionStore.getState().currentUser?.globalRole,
                readOrganizationalUnits: () => organizationalUnits.loadOrganizationalUnits(),
                registry,
              }),
          ),
        ),
  );

  return {
    eventPrograms,
    activities: createDeferredAdapter(async () =>
      isApi
        ? import("@/features/activity-catalog/adapters/apiActivitiesAdapter").then(
            ({ createApiActivitiesAdapter }) =>
              createApiActivitiesAdapter(apiOptions, readSessionAccessToken),
          )
        : getMockActivityRegistry().then((registry) =>
            import("@/features/activity-catalog/adapters/mockActivitiesAdapter").then(
              ({ createMockActivitiesAdapter, hasRetainedActivityHistory }) =>
                createMockActivitiesAdapter({
                  readCanDeleteActivity: () =>
                    useSessionStore.getState().currentUser?.globalRole === "ADMIN",
                  readEventPrograms: () => eventPrograms.loadEventPrograms("administrative", "ALL"),
                  readGlobalRole: () => useSessionStore.getState().currentUser?.globalRole,
                  readOrganizationalUnits: () => organizationalUnits.loadOrganizationalUnits(),
                  readRetainedHistory: hasRetainedActivityHistory,
                  registry,
                }),
            ),
          ),
    ),
    alerts: createDeferredAdapter(async () =>
      isApi
        ? import("@/features/alerts/adapters/apiAlertsAdapter").then(({ createApiAlertsAdapter }) =>
            createApiAlertsAdapter(apiOptions, readSessionAccessToken),
          )
        : import("@/features/alerts/adapters/mockAlertsAdapter").then(
            ({ createMockAlertsAdapter }) =>
              createMockAlertsAdapter(() => useSessionStore.getState().currentUser?.id),
          ),
    ),
    collaborators: createDeferredAdapter(async () =>
      isApi
        ? import("@/features/collaboration/adapters/apiCollaboratorsAdapter").then(
            ({ createApiCollaboratorsAdapter }) =>
              createApiCollaboratorsAdapter(apiOptions, readSessionAccessToken),
          )
        : Promise.all([getMockProgramRegistry(), getMockActivityRegistry()]).then(
            ([programRegistry, activityRegistry]) =>
              import("@/features/collaboration/adapters/mockCollaboratorsAdapter").then(
                ({ createMockCollaboratorsAdapter }) =>
                  createMockCollaboratorsAdapter({
                    readActivityProgramId: (activityId) =>
                      activityRegistry.get(activityId)?.eventProgramId,
                    readProgramState: (programId) => programRegistry.get(programId)?.status ?? null,
                  }),
              ),
          ),
    ),
    ownPermissions: createDeferredAdapter(async () =>
      isApi
        ? import("@/features/collaboration/adapters/apiOwnPermissionsAdapter").then(
            ({ createApiOwnPermissionsAdapter }) =>
              createApiOwnPermissionsAdapter(apiOptions, readSessionAccessToken),
          )
        : import("@/features/collaboration/adapters/mockOwnPermissionsAdapter").then(
            async ({ createMockOwnPermissionsAdapter }) => {
              const { createMockUserScopesAdapter } =
                await import("@/features/collaboration/adapters/mockUserScopesAdapter");
              return createMockOwnPermissionsAdapter(
                createMockUserScopesAdapter(
                  () => useSessionStore.getState().currentUser?.globalRole,
                ),
              );
            },
          ),
    ),
    activityCatalog: createDeferredAdapter(async () =>
      isApi
        ? import("@/features/activity-catalog/adapters/apiActivityCatalogAdapter").then(
            ({ createApiActivityCatalogAdapter }) =>
              createApiActivityCatalogAdapter(eventPrograms, apiOptions, readSessionAccessToken),
          )
        : getMockActivityRegistry().then((registry) =>
            import("@/features/activity-catalog/adapters/mockActivityCatalogAdapter").then(
              ({ createMockActivityCatalogAdapter }) =>
                createMockActivityCatalogAdapter(eventPrograms, { registry }),
            ),
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
        : getMockActivityRegistry().then((registry) =>
            import("@/features/classrooms/adapters/mockClassroomsAdapter").then(
              ({ createMockClassroomsAdapter }) =>
                createMockClassroomsAdapter({ readActivities: () => [...registry.values()] }),
            ),
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
    organizationalUnits,
    publicActivityCatalog: createDeferredAdapter(async () =>
      isApi
        ? import("@/features/activity-catalog/adapters/apiPublicActivityCatalogAdapter").then(
            ({ createApiPublicActivityCatalogAdapter }) =>
              createApiPublicActivityCatalogAdapter(apiOptions),
          )
        : getMockActivityRegistry().then((registry) =>
            import("@/features/activity-catalog/adapters/mockPublicActivityCatalogAdapter").then(
              ({ createMockPublicActivityCatalogAdapter }) =>
                createMockPublicActivityCatalogAdapter({
                  readActivities: () => [...registry.values()],
                  readEventPrograms: () => eventPrograms.loadEventPrograms("administrative", "ALL"),
                }),
            ),
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
    users: createDeferredAdapter(async () =>
      isApi
        ? import("@/features/users/adapters/apiUsersAdapter").then(({ createApiUsersAdapter }) =>
            createApiUsersAdapter(apiOptions, readSessionAccessToken),
          )
        : import("@/features/users/adapters/mockUsersAdapter").then(({ createMockUsersAdapter }) =>
            createMockUsersAdapter(),
          ),
    ),
    userScopes: createDeferredAdapter(async () =>
      isApi
        ? import("@/features/collaboration/adapters/apiUserScopesAdapter").then(
            ({ createApiUserScopesAdapter }) =>
              createApiUserScopesAdapter(apiOptions, readSessionAccessToken),
          )
        : Promise.all([getMockProgramRegistry(), getMockActivityRegistry()]).then(
            ([programRegistry, activityRegistry]) =>
              import("@/features/collaboration/adapters/mockUserScopesAdapter").then(
                ({ createMockUserScopesAdapter }) =>
                  createMockUserScopesAdapter(
                    () => useSessionStore.getState().currentUser?.globalRole,
                    () => [...programRegistry.values()],
                    () => [...activityRegistry.values()],
                  ),
              ),
          ),
    ),
  };
}
