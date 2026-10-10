// @vitest-environment node

import { afterEach, describe, expect, it } from "vitest";

import { mockActivityCatalog } from "@/data/mock/activityCatalog";
import { createActivity, createEventProgram } from "@/test/factories";
import type { Activity, ActivityStatus, EventProgramStatus } from "@/types/domain";

import { createMockPublicActivityCatalogAdapter } from "./mockPublicActivityCatalogAdapter";

const restores: (() => void)[] = [];

afterEach(() => {
  for (const restore of restores.splice(0).reverse()) {
    restore();
  }
});

function overrideActivityStatus(index: number, status: ActivityStatus): void {
  const activity = mockActivityCatalog.activities[index]!;
  const previous = activity.status;

  activity.status = status;
  restores.push(() => {
    activity.status = previous;
  });
}

function overrideActivityCancelReason(index: number, cancelReason: string | null): void {
  const activity = mockActivityCatalog.activities[index]!;
  const previous = activity.cancelReason;

  activity.cancelReason = cancelReason;
  restores.push(() => {
    activity.cancelReason = previous;
  });
}

function overrideProgramStatus(programId: string, status: EventProgramStatus): void {
  const program = mockActivityCatalog.eventPrograms.find(
    (candidate) => candidate.id === programId,
  )!;
  const previous = program.status;

  program.status = status;
  restores.push(() => {
    program.status = previous;
  });
}

describe("createMockPublicActivityCatalogAdapter", () => {
  it("should publish activities in the three public states", async () => {
    const catalog = await createMockPublicActivityCatalogAdapter().loadPublicActivities();
    const statuses = new Set(catalog.activities.map((activity) => activity.status));

    expect(statuses).toContain("SCHEDULED");
    expect(statuses).toContain("ONGOING");
    expect(statuses).toContain("COMPLETED");
  });

  it("should project the effective status of every published activity", async () => {
    overrideActivityStatus(0, "COMPLETED");

    const catalog = await createMockPublicActivityCatalogAdapter().loadPublicActivities();
    const statusesById = new Map(
      mockActivityCatalog.activities.map((activity) => [activity.id, activity.status]),
    );

    expect(catalog.activities.length).toBeGreaterThan(0);
    for (const activity of catalog.activities) {
      expect(["SCHEDULED", "ONGOING", "COMPLETED"]).toContain(activity.status);
      expect(activity.status).toBe(statusesById.get(activity.id));
    }
    expect(catalog.activities.some((activity) => activity.status === "COMPLETED")).toBe(true);
  });

  it("should never publish DRAFT or CANCELLED activities", async () => {
    const draft = mockActivityCatalog.activities[0]!;
    const cancelled = mockActivityCatalog.activities[1]!;
    overrideActivityStatus(0, "DRAFT");
    overrideActivityStatus(1, "CANCELLED");

    const catalog = await createMockPublicActivityCatalogAdapter().loadPublicActivities();
    const ids = catalog.activities.map((activity) => activity.id);

    expect(ids).not.toContain(draft.id);
    expect(ids).not.toContain(cancelled.id);
  });

  it("should exclude activities from event programs that are not active", async () => {
    const target = mockActivityCatalog.activities[0]!;
    overrideProgramStatus(target.eventProgramId, "DRAFT");

    const catalog = await createMockPublicActivityCatalogAdapter().loadPublicActivities();

    expect(catalog.activities.map((activity) => activity.id)).not.toContain(target.id);
  });

  it("should return deeply independent copies on every load", async () => {
    const adapter = createMockPublicActivityCatalogAdapter();
    const first = await adapter.loadPublicActivities();
    const second = await adapter.loadPublicActivities();
    const originalSpeakerName = second.activities[0]?.speakers[0]?.firstName;

    if (first.activities[0]?.speakers[0]) {
      first.activities[0].speakers[0].firstName = "Mutado";
    }

    expect(second).not.toBe(first);
    expect(second.activities[0]?.speakers[0]?.firstName).toBe(originalSpeakerName);
    expect(mockActivityCatalog.activities[0]?.speakers[0]?.firstName).toBe(originalSpeakerName);
  });
});

describe("createMockPublicActivityCatalogAdapter.getPublicActivity", () => {
  it("should project a published activity with its enrolled count and no administrative fields", async () => {
    const adapter = createMockPublicActivityCatalogAdapter();
    const catalog = await adapter.loadPublicActivities();
    const published = catalog.activities.find((activity) => activity.status === "SCHEDULED")!;
    const source = mockActivityCatalog.activities.find((activity) => activity.id === published.id)!;

    const detail = await adapter.getPublicActivity(published.id);

    expect(detail).toEqual({
      ...published,
      cancelReason: source.cancelReason,
      enrolledCount: source.enrolledCount,
    });
    expect(Object.keys(detail!)).not.toContain("equipment");
    expect(Object.keys(detail!)).not.toContain("checkedInCount");
  });

  it("should expose the ongoing and completed public states", async () => {
    const adapter = createMockPublicActivityCatalogAdapter();
    const catalog = await adapter.loadPublicActivities();
    const ongoing = catalog.activities.find((activity) => activity.status === "ONGOING")!;
    const completed = catalog.activities.find((activity) => activity.status === "COMPLETED")!;

    await expect(adapter.getPublicActivity(ongoing.id)).resolves.toMatchObject({
      status: "ONGOING",
    });
    await expect(adapter.getPublicActivity(completed.id)).resolves.toMatchObject({
      status: "COMPLETED",
    });
  });

  it("should return null for an unknown activity", async () => {
    await expect(
      createMockPublicActivityCatalogAdapter().getPublicActivity("missing"),
    ).resolves.toBeNull();
  });

  it("should return null for a DRAFT activity", async () => {
    const draft = mockActivityCatalog.activities[0]!;
    overrideActivityStatus(0, "DRAFT");

    await expect(
      createMockPublicActivityCatalogAdapter().getPublicActivity(draft.id),
    ).resolves.toBeNull();
  });

  it("should return null when the activity program is not active", async () => {
    const target = mockActivityCatalog.activities[0]!;
    overrideProgramStatus(target.eventProgramId, "ARCHIVED");

    await expect(
      createMockPublicActivityCatalogAdapter().getPublicActivity(target.id),
    ).resolves.toBeNull();
  });

  it("should expose a CANCELLED activity with its cancellation reason", async () => {
    const cancelled = mockActivityCatalog.activities[0]!;
    overrideActivityStatus(0, "CANCELLED");
    overrideActivityCancelReason(0, "Cancelada por lluvia");

    const detail = await createMockPublicActivityCatalogAdapter().getPublicActivity(cancelled.id);

    expect(detail?.status).toBe("CANCELLED");
    expect(detail?.cancelReason).toBe("Cancelada por lluvia");
  });

  it("should return deeply independent copies on every detail load", async () => {
    const adapter = createMockPublicActivityCatalogAdapter();
    const target = mockActivityCatalog.activities[0]!;
    const first = await adapter.getPublicActivity(target.id);
    const second = await adapter.getPublicActivity(target.id);
    const originalSpeakerName = second?.speakers[0]?.firstName;

    if (first?.speakers[0]) {
      first.speakers[0].firstName = "Mutado";
    }

    expect(second).not.toBe(first);
    expect(second?.speakers[0]?.firstName).toBe(originalSpeakerName);
    expect(target.speakers[0]?.firstName).toBe(originalSpeakerName);
  });
});

describe("createMockPublicActivityCatalogAdapter composition readers", () => {
  it("should read the current activities and programs of its composition", async () => {
    const adapter = createMockPublicActivityCatalogAdapter({
      readActivities: () => [
        createActivity({ eventProgramId: "program-1", id: "draft", status: "DRAFT" }),
        createActivity({ eventProgramId: "program-1", id: "scheduled", status: "SCHEDULED" }),
        createActivity({
          cancelReason: "Sin luz",
          eventProgramId: "program-1",
          id: "cancelled",
          status: "CANCELLED",
        }),
        createActivity({ eventProgramId: "program-archived", id: "archived" }),
      ],
      readEventPrograms: () => [
        createEventProgram(),
        createEventProgram({ id: "program-archived", status: "ARCHIVED" }),
      ],
    });

    const catalog = await adapter.loadPublicActivities();
    expect(catalog.activities.map((activity) => activity.id)).toEqual(["scheduled"]);

    await expect(adapter.getPublicActivity("draft")).resolves.toBeNull();
    await expect(adapter.getPublicActivity("archived")).resolves.toBeNull();
    await expect(adapter.getPublicActivity("cancelled")).resolves.toMatchObject({
      cancelReason: "Sin luz",
      status: "CANCELLED",
    });
  });

  it("should reflect later mutations of the shared registry", async () => {
    const activities: Activity[] = [
      createActivity({ eventProgramId: "program-1", id: "live", status: "DRAFT" }),
    ];
    const adapter = createMockPublicActivityCatalogAdapter({
      readActivities: () => activities,
      readEventPrograms: () => [createEventProgram()],
    });

    expect((await adapter.loadPublicActivities()).activities).toHaveLength(0);

    activities[0]!.status = "SCHEDULED";

    expect((await adapter.loadPublicActivities()).activities.map((a) => a.id)).toEqual(["live"]);
  });
});
