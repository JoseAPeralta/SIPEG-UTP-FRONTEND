import { waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import {
  createActivityCatalogPayload,
  createAuthenticatedUser,
  createAuthTokens,
  createClassroom,
} from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import { useClassroomsOverview } from "./useClassroomsOverview";

function buildAdapters(overrides: Partial<AppAdapters> = {}): AppAdapters {
  return {
    ...createAppAdapters({ source: "mock" }),
    activityCatalog: { loadCatalog: vi.fn().mockResolvedValue(createActivityCatalogPayload()) },
    classrooms: { loadClassrooms: vi.fn().mockResolvedValue([createClassroom()]) },
    ...overrides,
  };
}

describe("useClassroomsOverview", () => {
  beforeEach(() => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ id: "user-1" }),
      tokens: createAuthTokens(),
    });
  });

  afterEach(() => {
    useSessionStore.getState().clearSession();
  });

  it("should list classrooms without loading the activity catalog", async () => {
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(() => useClassroomsOverview(), { adapters });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.classrooms).toEqual([createClassroom()]);
    expect(adapters.activityCatalog.loadCatalog).not.toHaveBeenCalled();
    expect(adapters.classrooms.loadClassrooms).toHaveBeenCalledTimes(1);
  });

  it("should surface the classrooms failure", async () => {
    const adapters = buildAdapters({
      classrooms: { loadClassrooms: vi.fn().mockRejectedValue(new Error("aulas caidas")) },
    });
    const { result } = renderHookWithProviders(() => useClassroomsOverview(), { adapters });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error?.message).toBe("aulas caidas");
    expect(result.current.classrooms).toEqual([]);
  });
});
