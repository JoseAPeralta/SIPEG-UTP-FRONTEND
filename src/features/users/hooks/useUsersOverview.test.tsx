import { waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import {
  createActivityCatalogPayload,
  createAuthenticatedUser,
  createAuthTokens,
  createCareer,
  createOperationsReadModel,
  createOrganizationalUnit,
  createUser,
} from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import { useUsersOverview } from "./useUsersOverview";

function buildAdapters(overrides: Partial<AppAdapters> = {}): AppAdapters {
  return {
    ...createAppAdapters({ source: "mock" }),
    activityCatalog: { loadCatalog: vi.fn().mockResolvedValue(createActivityCatalogPayload()) },
    careers: { loadCareers: vi.fn().mockResolvedValue([createCareer()]) },
    operations: {
      loadOperations: vi.fn().mockResolvedValue(
        createOperationsReadModel({
          users: [
            createUser({ careerId: "software", id: "user-1", unitId: "fic" }),
            createUser({ careerId: null, id: "user-2", unitId: null }),
          ],
        }),
      ),
    },
    organizationalUnits: {
      loadOrganizationalUnits: vi.fn().mockResolvedValue([
        createOrganizationalUnit({
          code: "FIC",
          id: "fic",
          name: "Facultad de Ingenieria Civil",
        }),
      ]),
    },
    ...overrides,
  };
}

describe("useUsersOverview", () => {
  beforeEach(() => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ id: "admin-1" }),
      tokens: createAuthTokens(),
    });
  });

  afterEach(() => {
    useSessionStore.getState().clearSession();
  });

  it("should label users from the career and unit catalogs instead of the operations aggregate", async () => {
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(() => useUsersOverview(), { adapters });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.rows).toEqual([
      {
        careerName: "Desarrollo de Software",
        unitLabel: "FIC",
        user: createUser({ careerId: "software", id: "user-1", unitId: "fic" }),
      },
      {
        careerName: null,
        unitLabel: null,
        user: createUser({ careerId: null, id: "user-2", unitId: null }),
      },
    ]);
    expect(adapters.operations.loadOperations).toHaveBeenCalledTimes(1);
    expect(adapters.activityCatalog.loadCatalog).not.toHaveBeenCalled();
    expect(adapters.careers.loadCareers).toHaveBeenCalledTimes(1);
    expect(adapters.organizationalUnits.loadOrganizationalUnits).toHaveBeenCalledTimes(1);
  });

  it("should keep labels empty until the catalogs resolve", async () => {
    const adapters = buildAdapters({
      careers: { loadCareers: vi.fn().mockRejectedValue(new Error("carreras caidas")) },
    });
    const { result } = renderHookWithProviders(() => useUsersOverview(), { adapters });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error?.message).toBe("carreras caidas");
    expect(result.current.rows.map((row) => row.careerName)).toEqual([null, null]);
  });
});
