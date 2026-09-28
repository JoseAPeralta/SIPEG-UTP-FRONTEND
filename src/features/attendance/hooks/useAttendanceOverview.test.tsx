import { waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useSessionStore } from "@/store/session";
import { useWorkingContextStore } from "@/store/workingContext";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import { useAttendanceOverview } from "./useAttendanceOverview";

describe("useAttendanceOverview", () => {
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

  it("should scope attendance records to the selected program", async () => {
    useWorkingContextStore
      .getState()
      .setWorkingContext({ id: "program-innovation-week", kind: "eventProgram" });

    const { result } = renderHookWithProviders(() => useAttendanceOverview());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.records.length).toBeGreaterThan(0);
    expect(
      result.current.records.every((record) =>
        result.current.scope?.activityIds.includes(record.activityId),
      ),
    ).toBe(true);
  });

  it("should report no records without a working context", async () => {
    const { result } = renderHookWithProviders(() => useAttendanceOverview());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.records).toEqual([]);
    expect(result.current.scope).toBeNull();
  });
});
