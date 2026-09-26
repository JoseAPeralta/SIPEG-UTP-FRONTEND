import { act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useWorkingContextStore } from "@/store/workingContext";
import { renderHookWithProviders } from "@/test/render";

import { useWorkingContext } from "./useWorkingContext";

describe("useWorkingContext", () => {
  beforeEach(() => {
    useWorkingContextStore.getState().clearWorkingContext();
  });

  it("should resolve the scope of a selected event program", async () => {
    useWorkingContextStore
      .getState()
      .setWorkingContext({ id: "program-innovation-week", kind: "eventProgram" });

    const { result } = renderHookWithProviders(() => useWorkingContext());

    await waitFor(() => expect(result.current.scope).not.toBeNull());
    expect(result.current.scope?.program.id).toBe("program-innovation-week");
    expect(result.current.scope?.activityIds.length).toBeGreaterThan(0);
  });

  it("should resolve the scope of a selected activity", async () => {
    useWorkingContextStore
      .getState()
      .setWorkingContext({ id: "activity-open-data-governance", kind: "activity" });

    const { result } = renderHookWithProviders(() => useWorkingContext());

    await waitFor(() => expect(result.current.scope).not.toBeNull());
    expect(result.current.scope?.activityIds).toEqual(["activity-open-data-governance"]);
    expect(result.current.scope?.unit.code).toBe("FISC");
  });

  it("should ignore unknown selections", async () => {
    useWorkingContextStore
      .getState()
      .setWorkingContext({ id: "activity-missing", kind: "activity" });

    const { result } = renderHookWithProviders(() => useWorkingContext());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.scope).toBeNull();
  });

  it("should update the store from a serialized value", async () => {
    const { result } = renderHookWithProviders(() => useWorkingContext());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.onValueChange("activity:activity-open-data-governance"));
    expect(useWorkingContextStore.getState().workingContext).toEqual({
      id: "activity-open-data-governance",
      kind: "activity",
    });

    act(() => result.current.onValueChange(""));
    expect(useWorkingContextStore.getState().workingContext).toBeNull();
  });
});
