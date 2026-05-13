import { describe, expect, it } from "vitest";

import { classrooms, largeEvents, smallEvents } from "@/data/sipeg";

function getSpeakerKey(name: string, organization: string) {
  return `${name}::${organization}`;
}

describe("event mock data", () => {
  it("should provide the requested amount of large and small events", () => {
    expect(largeEvents).toHaveLength(5);
    expect(smallEvents).toHaveLength(50);
  });

  it("should keep every small event parent reference valid", () => {
    const largeEventIds = new Set(largeEvents.map((event) => event.id));
    const parentIds = smallEvents.flatMap((event) =>
      event.parentEventId ? [event.parentEventId] : [],
    );

    expect(parentIds.length).toBeGreaterThan(0);
    expect(parentIds.every((parentId) => largeEventIds.has(parentId))).toBe(true);
    expect(smallEvents.some((event) => !event.parentEventId)).toBe(true);
  });

  it("should include events with and without faculty assignment", () => {
    expect(smallEvents.some((event) => event.facultyId)).toBe(true);
    expect(smallEvents.some((event) => !event.facultyId)).toBe(true);
  });

  it("should reuse speakers and institutions across realistic events", () => {
    const speakerCounts = new Map<string, number>();
    const institutionCounts = new Map<string, number>();

    smallEvents.forEach((event) => {
      event.speakers.forEach((speaker) => {
        const speakerKey = getSpeakerKey(speaker.name, speaker.organization);
        speakerCounts.set(speakerKey, (speakerCounts.get(speakerKey) ?? 0) + 1);
        institutionCounts.set(
          speaker.organization,
          (institutionCounts.get(speaker.organization) ?? 0) + 1,
        );
      });
    });

    expect([...speakerCounts.values()].some((count) => count > 1)).toBe(true);
    expect([...institutionCounts.values()].some((count) => count > 2)).toBe(true);
  });

  it("should model same-day classroom reuse at different hours", () => {
    const classroomIds = new Set(classrooms.map((classroom) => classroom.id));
    const eventsByDateAndClassroom = new Map<string, string[]>();

    smallEvents.forEach((event) => {
      expect(classroomIds.has(event.classroomId)).toBe(true);

      const groupKey = `${event.date}-${event.classroomId}`;
      eventsByDateAndClassroom.set(groupKey, [
        ...(eventsByDateAndClassroom.get(groupKey) ?? []),
        event.startTime,
      ]);
    });

    expect(
      [...eventsByDateAndClassroom.values()].some((startTimes) => new Set(startTimes).size > 1),
    ).toBe(true);
  });

  it("should model repeated start times on different dates or places", () => {
    const eventsByStartTime = new Map<string, { classroomId: string; date: string }[]>();

    smallEvents.forEach((event) => {
      eventsByStartTime.set(event.startTime, [
        ...(eventsByStartTime.get(event.startTime) ?? []),
        { classroomId: event.classroomId, date: event.date },
      ]);
    });

    expect(
      [...eventsByStartTime.values()].some((events) => {
        const dateAndPlaceKeys = new Set(
          events.map((event) => `${event.date}-${event.classroomId}`),
        );

        return dateAndPlaceKeys.size > 1;
      }),
    ).toBe(true);
  });
});
