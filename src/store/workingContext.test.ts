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
});
