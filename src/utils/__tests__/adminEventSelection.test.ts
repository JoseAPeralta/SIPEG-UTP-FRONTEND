import { describe, expect, it } from "vitest";

import { largeEvents, smallEvents } from "@/data/sipeg";
import {
  getAdminEventOptions,
  getRelatedSmallEventIds,
  getSelectedEventLabel,
} from "@utils/adminEventSelection";

describe("admin event selection utilities", () => {
  it("should list large and small events as selectable options", () => {
    const options = getAdminEventOptions();

    expect(options).toHaveLength(largeEvents.length + smallEvents.length);
    expect(options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: largeEvents[0]?.id, type: "large" }),
        expect.objectContaining({ id: smallEvents[0]?.id, type: "small" }),
      ]),
    );
  });

  it("should resolve a small event to itself", () => {
    expect(getRelatedSmallEventIds("small-smart-campus")).toEqual(["small-smart-campus"]);
  });

  it("should resolve a large event to its child small events", () => {
    const childEventIds = smallEvents
      .filter((event) => event.parentEventId === "large-innovation-week")
      .map((event) => event.id);

    expect(getRelatedSmallEventIds("large-innovation-week")).toEqual(childEventIds);
  });

  it("should return no related events when there is no selection", () => {
    expect(getRelatedSmallEventIds(null)).toEqual([]);
  });

  it("should return the selected event label", () => {
    expect(getSelectedEventLabel("small-smart-campus")).toBe("Campus inteligente y datos abiertos");
    expect(getSelectedEventLabel("unknown-event")).toBeNull();
  });
});
