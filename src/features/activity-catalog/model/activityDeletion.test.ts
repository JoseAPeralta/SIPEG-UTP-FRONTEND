// @vitest-environment node

import { describe, expect, it } from "vitest";

import type { ActivityStatus, EventProgramStatus } from "@/types/domain";

import { canOfferActivityDeletion } from "./activityDeletion";

const ACTIVITY_STATUSES: readonly ActivityStatus[] = [
  "DRAFT",
  "SCHEDULED",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
];

const PROGRAM_STATUSES: readonly EventProgramStatus[] = [
  "DRAFT",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
];

function offer(
  activityStatus: ActivityStatus,
  programStatus: EventProgramStatus | null,
  hasDeletePermission = true,
) {
  return canOfferActivityDeletion({ activityStatus, hasDeletePermission, programStatus });
}

describe("canOfferActivityDeletion", () => {
  it("should offer deletion only for a draft of an active program with permission", () => {
    expect(offer("DRAFT", "ACTIVE")).toBe(true);
  });

  it("should block every activity status other than draft", () => {
    for (const status of ACTIVITY_STATUSES) {
      if (status === "DRAFT") continue;
      expect(offer(status, "ACTIVE")).toBe(false);
    }
  });

  it("should block every program status other than active, including null", () => {
    for (const status of PROGRAM_STATUSES) {
      if (status === "ACTIVE") continue;
      expect(offer("DRAFT", status)).toBe(false);
    }
    expect(offer("DRAFT", null)).toBe(false);
  });

  it("should block a draft of an active program without delete permission", () => {
    expect(offer("DRAFT", "ACTIVE", false)).toBe(false);
  });
});
