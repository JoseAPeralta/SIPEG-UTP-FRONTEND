import type { AppAdapters } from "./contracts";
import { resolveDataSource, type DataSource } from "./dataSource";
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
import { createApiUserScopesAdapter } from "@/features/collaboration/adapters/apiUserScopesAdapter";
import { createMockUserScopesAdapter } from "@/features/collaboration/adapters/mockUserScopesAdapter";
import { createApiOwnPermissionsAdapter } from "@/features/collaboration/adapters/apiOwnPermissionsAdapter";
import { createMockOwnPermissionsAdapter } from "@/features/collaboration/adapters/mockOwnPermissionsAdapter";
import { createApiCollaboratorsAdapter } from "@/features/collaboration/adapters/apiCollaboratorsAdapter";
import { createMockCollaboratorsAdapter } from "@/features/collaboration/adapters/mockCollaboratorsAdapter";
import { createMockOperationsAdapter } from "@/features/operations/adapters/mockOperationsAdapter";
import { createUnavailableOperationsAdapter } from "@/features/operations/adapters/unavailableOperationsAdapter";
import { createApiOrganizationalUnitsAdapter } from "@/features/organizational-units/adapters/apiOrganizationalUnitsAdapter";
import { createMockOrganizationalUnitsAdapter } from "@/features/organizational-units/adapters/mockOrganizationalUnitsAdapter";
import {
  createApiRegistrationAdapter,
  createMockRegistrationAdapter,
} from "@/features/registration/adapters";
import { createApiUsersAdapter } from "@/features/users/adapters/apiUsersAdapter";
import { createMockUsersAdapter } from "@/features/users/adapters/mockUsersAdapter";
import { useSessionStore } from "@/store/session";

export { resolveDataSource } from "./dataSource";
export type { DataSource } from "./dataSource";

export type CreateAppAdaptersOptions = {
  apiOptions?: ApiActivityCatalogAdapterOptions;
  source?: DataSource;
};

function readSessionAccessToken(): string | null {
  return useSessionStore.getState().tokens?.accessToken ?? null;
}

export function createAppAdapters({
  apiOptions = {},
  source = resolveDataSource(),
}: CreateAppAdaptersOptions = {}): AppAdapters {
  if (source === "api") {
    return {
      collaborators: createApiCollaboratorsAdapter(apiOptions, readSessionAccessToken),
      ownPermissions: createApiOwnPermissionsAdapter(apiOptions, readSessionAccessToken),
      activityCatalog: createApiActivityCatalogAdapter(
        {
          ...apiOptions,
        },
        readSessionAccessToken,
      ),
      auth: createApiAuthAdapter(apiOptions),
      careers: createApiCareersAdapter(apiOptions, readSessionAccessToken),
      classrooms: createApiClassroomsAdapter(apiOptions, readSessionAccessToken),
      organizationalUnits: createApiOrganizationalUnitsAdapter(apiOptions, readSessionAccessToken),
      operations: createUnavailableOperationsAdapter(),
      publicActivityCatalog: createApiPublicActivityCatalogAdapter(apiOptions),
      registration: createApiRegistrationAdapter(apiOptions),
      users: createApiUsersAdapter(apiOptions, readSessionAccessToken),
      userScopes: createApiUserScopesAdapter(apiOptions, readSessionAccessToken),
    };
  }

  const userScopes = createMockUserScopesAdapter(
    () => useSessionStore.getState().currentUser?.globalRole,
  );
  return {
    collaborators: createMockCollaboratorsAdapter(),
    ownPermissions: createMockOwnPermissionsAdapter(userScopes),
    activityCatalog: createMockActivityCatalogAdapter(),
    auth: createMockAuthAdapter(),
    careers: createMockCareersAdapter(),
    classrooms: createMockClassroomsAdapter(),
    organizationalUnits: createMockOrganizationalUnitsAdapter(),
    operations: createMockOperationsAdapter(),
    publicActivityCatalog: createMockPublicActivityCatalogAdapter(),
    registration: createMockRegistrationAdapter(),
    users: createMockUsersAdapter(),
    userScopes,
  };
}
