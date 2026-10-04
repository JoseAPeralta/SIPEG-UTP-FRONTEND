import { waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import { useWorkingContextStore } from "@/store/workingContext";
import {
  createAdminUser,
  createAuthenticatedUser,
  createAuthTokens,
  createCertificate,
  createOperationsReadModel,
} from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import { useCertificatesOverview } from "./useCertificatesOverview";

function buildAdapters(overrides: Partial<AppAdapters> = {}): AppAdapters {
  return {
    ...createAppAdapters({ source: "mock" }),
    operations: {
      loadOperations: vi.fn().mockResolvedValue(
        createOperationsReadModel({
          certificates: [
            createCertificate({
              activityId: "activity-open-data-governance",
              id: "certificate-1",
              userId: "user-2",
            }),
          ],
        }),
      ),
    },
    users: {
      loadUsers: vi
        .fn()
        .mockResolvedValue([
          createAdminUser({ firstName: "Carlos", id: "user-2", lastName: "Mendez" }),
        ]),
    },
    ...overrides,
  };
}

describe("useCertificatesOverview", () => {
  beforeEach(() => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ id: "admin-1" }),
      tokens: createAuthTokens(),
    });
    useWorkingContextStore.getState().setWorkingContext({
      id: "activity-open-data-governance",
      kind: "activity",
    });
  });

  afterEach(() => {
    useSessionStore.getState().clearSession();
    useWorkingContextStore.getState().clearWorkingContext();
  });

  it("should resolve participant names from the users adapter", async () => {
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(() => useCertificatesOverview(), { adapters });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0]?.userName).toBe("Carlos Mendez");
    expect(result.current.rows[0]?.certificate.id).toBe("certificate-1");
    expect(result.current.rows[0]?.activityName).not.toBeNull();
    expect(adapters.users.loadUsers).toHaveBeenCalledTimes(1);
  });

  it("should expose the users listing failure", async () => {
    const adapters = buildAdapters({
      users: { loadUsers: vi.fn().mockRejectedValue(new Error("usuarios caidos")) },
    });
    const { result } = renderHookWithProviders(() => useCertificatesOverview(), { adapters });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error?.message).toBe("usuarios caidos");
  });
});
