import { waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import {
  createAdminUser,
  createAuthenticatedUser,
  createAuthTokens,
  createOperationsReadModel,
} from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import { useUsersOverview } from "./useUsersOverview";

const softwareCareer = { code: "SOFTWARE", id: "software", name: "Desarrollo de Software" };
const fiscUnit = { code: "FISC", id: "fisc", name: "Facultad de Ingenieria de Sistemas" };

function buildAdapters(overrides: Partial<AppAdapters> = {}): AppAdapters {
  return {
    ...createAppAdapters({ source: "mock" }),
    careers: { loadCareers: vi.fn().mockResolvedValue([]) },
    operations: { loadOperations: vi.fn().mockResolvedValue(createOperationsReadModel()) },
    organizationalUnits: { loadOrganizationalUnits: vi.fn().mockResolvedValue([]) },
    users: {
      loadUsers: vi
        .fn()
        .mockResolvedValue([
          createAdminUser({ career: softwareCareer, id: "user-1", unit: fiscUnit }),
          createAdminUser({ career: null, id: "user-2", unit: null }),
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

  it("should label users from the embedded references without consulting the catalogs", async () => {
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(() => useUsersOverview(), { adapters });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.rows).toEqual([
      {
        careerName: "Desarrollo de Software",
        unitLabel: "FISC",
        user: createAdminUser({ career: softwareCareer, id: "user-1", unit: fiscUnit }),
      },
      {
        careerName: null,
        unitLabel: null,
        user: createAdminUser({ career: null, id: "user-2", unit: null }),
      },
    ]);
    expect(adapters.users.loadUsers).toHaveBeenCalledTimes(1);
    expect(adapters.careers.loadCareers).not.toHaveBeenCalled();
    expect(adapters.organizationalUnits.loadOrganizationalUnits).not.toHaveBeenCalled();
    expect(adapters.operations.loadOperations).not.toHaveBeenCalled();
  });

  it("should expose the listing failure and keep rows empty", async () => {
    const adapters = buildAdapters({
      users: { loadUsers: vi.fn().mockRejectedValue(new Error("usuarios caidos")) },
    });
    const { result } = renderHookWithProviders(() => useUsersOverview(), { adapters });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error?.message).toBe("usuarios caidos");
    expect(result.current.rows).toEqual([]);
  });
});
