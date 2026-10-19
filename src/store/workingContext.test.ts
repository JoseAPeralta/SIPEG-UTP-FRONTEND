// @vitest-environment node

import { describe, expect, it } from "vitest";

import { useWorkingContextStore } from "./workingContext";

describe("useWorkingContextStore", () => {
  it("should store and clear both selection kinds", () => {
    useWorkingContextStore.getState().setWorkingContext({ id: "program-1", kind: "eventProgram" });
    expect(useWorkingContextStore.getState().workingContext).toEqual({
      id: "program-1",
      kind: "eventProgram",
    });

    useWorkingContextStore.getState().setWorkingContext({ id: "activity-1", kind: "activity" });
    expect(useWorkingContextStore.getState().workingContext).toEqual({
      id: "activity-1",
      kind: "activity",
    });

    useWorkingContextStore.getState().clearWorkingContext();
    expect(useWorkingContextStore.getState().workingContext).toBeNull();
  });

  it("should announce a revoked selection and retire it", () => {
    useWorkingContextStore.getState().setWorkingContext({ id: "program-1", kind: "eventProgram" });

    useWorkingContextStore.getState().noteRevokedSelection();

    expect(useWorkingContextStore.getState().workingContext).toBeNull();
    expect(useWorkingContextStore.getState().contextRevokedNotice).toBe(true);
  });

  it("should reset the notice with a new selection or an explicit clear", () => {
    useWorkingContextStore.getState().noteRevokedSelection();
    useWorkingContextStore.getState().setWorkingContext({ id: "program-2", kind: "eventProgram" });
    expect(useWorkingContextStore.getState().contextRevokedNotice).toBe(false);

    useWorkingContextStore.getState().noteRevokedSelection();
    useWorkingContextStore.getState().clearWorkingContext();
    expect(useWorkingContextStore.getState().contextRevokedNotice).toBe(false);
  });
});
