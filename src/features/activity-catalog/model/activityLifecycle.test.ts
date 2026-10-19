// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  ACTIVITY_CANCEL_REASON_MAX_LENGTH,
  ActivityCancelReasonError,
  buildCancelActivityRequest,
  getActivityLifecycleActions,
} from "./activityLifecycle";

describe("getActivityLifecycleActions", () => {
  it("resolves the transition matrix per status", () => {
    expect(getActivityLifecycleActions("DRAFT")).toEqual(["publish", "cancel"]);
    expect(getActivityLifecycleActions("SCHEDULED")).toEqual(["unpublish", "cancel"]);
    expect(getActivityLifecycleActions("ONGOING")).toEqual(["cancel"]);
    expect(getActivityLifecycleActions("COMPLETED")).toEqual([]);
    expect(getActivityLifecycleActions("CANCELLED")).toEqual([]);
  });

  it("does not decide authorization", () => {
    expect(getActivityLifecycleActions("DRAFT")).toContain("publish");
    expect(getActivityLifecycleActions("COMPLETED")).toHaveLength(0);
  });
});

describe("buildCancelActivityRequest", () => {
  it("omits the reason when it is absent, empty or only spaces", () => {
    expect(buildCancelActivityRequest()).toEqual({});
    expect(buildCancelActivityRequest(undefined)).toEqual({});
    expect(buildCancelActivityRequest(null)).toEqual({});
    expect(buildCancelActivityRequest("")).toEqual({});
    expect(buildCancelActivityRequest("   ")).toEqual({});
  });

  it("trims the surrounding spaces of a non-empty reason", () => {
    expect(buildCancelActivityRequest("  Lluvia intensa  ")).toEqual({ reason: "Lluvia intensa" });
  });

  it("accepts a normalized reason of exactly the maximum length", () => {
    const reason = "a".repeat(ACTIVITY_CANCEL_REASON_MAX_LENGTH);

    expect(buildCancelActivityRequest(reason)).toEqual({ reason });
  });

  it("rejects a normalized reason beyond the maximum length", () => {
    const reason = "a".repeat(ACTIVITY_CANCEL_REASON_MAX_LENGTH + 1);

    expect(() => buildCancelActivityRequest(reason)).toThrow(ActivityCancelReasonError);
  });

  it("never emits a null or empty reason", () => {
    const request = buildCancelActivityRequest("   ");

    expect(request).not.toHaveProperty("reason");
  });
});
