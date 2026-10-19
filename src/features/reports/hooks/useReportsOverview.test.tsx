import { waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useSessionStore } from "@/store/session";
import { useWorkingContextStore } from "@/store/workingContext";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import { useReportsOverview } from "./useReportsOverview";

describe("useReportsOverview", () => {
  beforeEach(() => {
    useWorkingContextStore.getState().clearWorkingContext();
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens(),
    });
  });

  afterEach(() => {
    useSessionStore.getState().clearSession();
  });

  it("should scope the report to the selected program without inventing enrollment totals", async () => {
    useWorkingContextStore
      .getState()
      .setWorkingContext({ id: "program-innovation-week", kind: "eventProgram" });

    const { result } = renderHookWithProviders(() => useReportsOverview());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.scope?.activityIds.length).toBeGreaterThan(0);
    expect(result.current.report?.activities.length).toBeGreaterThan(0);
    expect(result.current.report?.enrolledCount).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("should report no report without a working context", async () => {
    const { result } = renderHookWithProviders(() => useReportsOverview());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.report).toBeNull();
    expect(result.current.scope).toBeNull();
  });
});
