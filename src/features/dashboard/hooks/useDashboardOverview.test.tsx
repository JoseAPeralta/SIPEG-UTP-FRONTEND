import { waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createAuthTokens, createCatalog } from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import { useDashboardOverview } from "./useDashboardOverview";

function buildAdapters(overrides: Partial<AppAdapters> = {}): AppAdapters {
  return {
    ...createAppAdapters({ source: "mock" }),
    activityCatalog: { loadCatalog: vi.fn().mockResolvedValue(createCatalog()) },
    operations: { loadOperations: vi.fn().mockRejectedValue(new Error("operaciones caidas")) },
    ...overrides,
  };
}

describe("useDashboardOverview", () => {
  beforeEach(() => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens(),
    });
  });

  afterEach(() => {
    useSessionStore.getState().clearSession();
  });

  it("should keep catalog metrics when operations are unavailable", async () => {
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(() => useDashboardOverview(), { adapters });

    await waitFor(() => expect(result.current.operationsError).not.toBeNull());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.visibleActivityCount).toBeGreaterThan(0);
    expect(result.current.confirmedAttendanceCount).toBe(0);
    expect(result.current.generatedCertificatesCount).toBe(0);
  });

  it("should expose the catalog error as the blocking error", async () => {
    const adapters = buildAdapters({
      activityCatalog: { loadCatalog: vi.fn().mockRejectedValue(new Error("catalogo caido")) },
    });
    const { result } = renderHookWithProviders(() => useDashboardOverview(), { adapters });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error?.message).toBe("catalogo caido");
  });
});
