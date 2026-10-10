// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { eventPrograms } from "@/data/mock/eventPrograms";
import { organizationalUnits } from "@/data/mock/organizationalUnits";
import type { EventProgram } from "@/types/domain";
import type {
  CreateEventProgramRequest,
  UpdateEventProgramRequest,
} from "../model/eventProgramRequests";
import {
  createMockEventProgramRegistry,
  createMockEventProgramsAdapter,
} from "./mockEventProgramsAdapter";

vi.mock("@/data/mock/eventPrograms", async (importOriginal) => {
  const original = await importOriginal<{
    eventPrograms: EventProgram[];
    eventProgramsWithRunningActivities: readonly string[];
  }>();
  const base = original.eventPrograms[0]!;

  return {
    eventPrograms: [
      ...original.eventPrograms,
      ...Array.from({ length: 24 }, (_, index) => ({
        ...base,
        id: `generated-program-${index}`,
        isDefault: false,
        label: null,
        name: `Programa generado ${String(index).padStart(2, "0")}`,
        status: "ACTIVE" as const,
      })),
    ],
    eventProgramsWithRunningActivities: original.eventProgramsWithRunningActivities,
  };
});

const activePrograms = () => eventPrograms.filter((program) => program.status === "ACTIVE");

const creationRequest: CreateEventProgramRequest = {
  description: "Cierre academico del semestre.",
  endDate: "2026-12-20",
  label: "Cierre 2026",
  name: "Cierre de Ano Academico",
  organizationalUnitId: "fisc",
  startDate: "2026-12-18",
};

function administratorAdapter() {
  return createMockEventProgramsAdapter({ readGlobalRole: () => "ADMIN" });
}

describe("createMockEventProgramsAdapter", () => {
  it("returns independent copies of the program fixtures", async () => {
    const adapter = createMockEventProgramsAdapter();
    const first = await adapter.loadEventPrograms("administrative");
    expect(first).toEqual(activePrograms());
    first[0]!.name = "changed";
    expect(await adapter.loadEventPrograms("public")).toEqual(activePrograms());
  });

  it("uses the contractual ACTIVE default for both access modes without a status filter", async () => {
    const adapter = createMockEventProgramsAdapter();
    for (const access of ["public", "administrative"] as const) {
      const programs = await adapter.loadEventPrograms(access);
      expect(programs.some((program) => program.status !== "ACTIVE")).toBe(false);
    }
  });

  it("honors the ALL status in the flat listing only for an administrator", async () => {
    const all = await administratorAdapter().loadEventPrograms("administrative", "ALL");
    expect(all).toEqual(eventPrograms);

    for (const role of [undefined, "USER"] as const) {
      const restricted = await createMockEventProgramsAdapter({
        readGlobalRole: () => role,
      }).loadEventPrograms("administrative", "ALL");
      expect(restricted).toEqual(activePrograms());
    }
  });

  it("lists ACTIVE programs by default for an administrator", async () => {
    const page = await administratorAdapter().loadEventProgramsPage!({}, 1);

    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((program) => program.status === "ACTIVE")).toBe(true);
  });

  it("honors ALL and non-active statuses only for an administrator", async () => {
    const all = await administratorAdapter().loadEventProgramsPage!({ status: "ALL" }, 1);
    const lastPage = await administratorAdapter().loadEventProgramsPage!(
      { status: "ALL" },
      all.totalPages,
    );
    const statuses = [...all.items, ...lastPage.items].map((program) => program.status);
    expect(statuses).toContain("DRAFT");
    expect(statuses).toContain("ARCHIVED");
    expect(all.total).toBe(eventPrograms.length);

    const drafts = await administratorAdapter().loadEventProgramsPage!({ status: "DRAFT" }, 1);
    expect(drafts.items.length).toBeGreaterThan(0);
    expect(drafts.items.every((program) => program.status === "DRAFT")).toBe(true);

    for (const role of [undefined, "USER"] as const) {
      const adapter = createMockEventProgramsAdapter({ readGlobalRole: () => role });
      const restricted = await adapter.loadEventProgramsPage!({ status: "ALL" }, 1);
      expect(restricted.items.every((program) => program.status === "ACTIVE")).toBe(true);
      expect(restricted.total).toBe(activePrograms().length);
    }
  });

  it("searches by program name or custom label", async () => {
    const byName = await administratorAdapter().loadEventProgramsPage!({ q: "manufactura" }, 1);
    expect(byName.items.map((program) => program.id)).toContain(
      "program-manufacturing-robotics-week",
    );

    const byLabel = await administratorAdapter().loadEventProgramsPage!(
      { q: "Gobernanza de datos", status: "ALL" },
      1,
    );
    expect(byLabel.items.map((program) => program.id)).toEqual([
      "program-data-governance-workshop",
    ]);
  });

  it("filters by organizational unit and embeds its display data", async () => {
    const page = await administratorAdapter().loadEventProgramsPage!(
      { organizationalUnitId: "fim", status: "ALL" },
      1,
    );

    expect(page.items.length).toBeGreaterThan(0);
    for (const program of page.items) {
      expect(program.organizationalUnitId).toBe("fim");
      const unit = organizationalUnits.find((candidate) => candidate.id === "fim");
      expect(program.organizationalUnit).toEqual({
        id: "fim",
        name: unit?.name,
        type: "FACULTY",
      });
    }
  });

  it("orders results by name and paginates 20 items per page", async () => {
    const adapter = administratorAdapter();
    const firstPage = await adapter.loadEventProgramsPage!({ status: "ALL" }, 1);
    const secondPage = await adapter.loadEventProgramsPage!({ status: "ALL" }, 2);

    expect(firstPage.items).toHaveLength(20);
    expect(firstPage.limit).toBe(20);
    expect(firstPage.page).toBe(1);
    expect(firstPage.total).toBe(eventPrograms.length);
    expect(firstPage.totalPages).toBe(Math.ceil(eventPrograms.length / 20));
    expect(secondPage.items).toHaveLength(eventPrograms.length - 20);

    const names = [...firstPage.items, ...secondPage.items].map((program) => program.name);
    expect(names).toEqual([...names].sort((left, right) => left.localeCompare(right, "es")));
  });

  it("returns independent copies from the page operation", async () => {
    const adapter = administratorAdapter();
    const first = await adapter.loadEventProgramsPage!({ status: "ALL" }, 1);
    first.items[0]!.name = "changed";

    const second = await adapter.loadEventProgramsPage!({ status: "ALL" }, 1);
    expect(second.items[0]!.name).not.toBe("changed");
  });

  it("creates a draft program that appears in the administrative listing", async () => {
    const adapter = administratorAdapter();
    const created = await adapter.createEventProgram!(creationRequest);

    expect(created).toMatchObject({
      description: creationRequest.description,
      isDefault: false,
      label: creationRequest.label,
      name: creationRequest.name,
      organizationalUnitId: "fisc",
      status: "DRAFT",
    });

    const page = await adapter.loadEventProgramsPage!({ status: "ALL" }, 1);
    expect(page.total).toBe(eventPrograms.length + 1);
    const listed = (
      await Promise.all(
        Array.from({ length: page.totalPages }, (_, index) =>
          adapter.loadEventProgramsPage!({ status: "ALL" }, index + 1),
        ),
      )
    )
      .flatMap((result) => result.items)
      .find((program) => program.id === created.id);
    expect(listed).toMatchObject({ id: created.id, status: "DRAFT" });
  });

  it("keeps a created draft out of the public ACTIVE reading", async () => {
    const adapter = administratorAdapter();
    const created = await adapter.createEventProgram!(creationRequest);

    const publicPrograms = await adapter.loadEventPrograms("public");
    expect(publicPrograms.some((program) => program.id === created.id)).toBe(false);
  });

  it("ignores injected properties and does not share the created program across instances", async () => {
    const adapter = administratorAdapter();
    const injected = {
      ...creationRequest,
      id: "injected-id",
      isDefault: true,
      status: "ACTIVE",
    } as unknown as CreateEventProgramRequest;

    const created = await adapter.createEventProgram!(injected);
    expect(created.id).not.toBe("injected-id");
    expect(created.isDefault).toBe(false);
    expect(created.status).toBe("DRAFT");

    const other = administratorAdapter();
    const otherPage = await other.loadEventProgramsPage!({ status: "ALL" }, 1);
    expect(otherPage.total).toBe(eventPrograms.length);
  });

  it("shares an explicit registry and keeps default registries isolated", async () => {
    const registry = createMockEventProgramRegistry();
    const adapter = createMockEventProgramsAdapter({ readGlobalRole: () => "ADMIN", registry });

    const created = await adapter.createEventProgram!(creationRequest);
    expect(registry.get(created.id)).toMatchObject({ id: created.id, status: "DRAFT" });
    expect(registry.size).toBe(eventPrograms.length + 1);

    const isolated = administratorAdapter();
    const page = await isolated.loadEventProgramsPage!({ status: "ALL" }, 1);
    expect(page.total).toBe(eventPrograms.length);
    expect(page.items.some((program) => program.id === created.id)).toBe(false);
  });

  it("archives a program through its shared registry", async () => {
    const registry = createMockEventProgramRegistry();
    const adapter = createMockEventProgramsAdapter({ readGlobalRole: () => "ADMIN", registry });

    const created = await adapter.createEventProgram!(creationRequest);
    await adapter.archiveEventProgram!(created.id);

    expect(registry.get(created.id)?.status).toBe("ARCHIVED");
  });

  it("rejects creation without an administrator role", async () => {
    const adapter = createMockEventProgramsAdapter({ readGlobalRole: () => "USER" });

    await expect(adapter.createEventProgram!(creationRequest)).rejects.toMatchObject({
      status: 403,
    });
  });

  it("rejects an inactive or unknown unit with the contractual 400", async () => {
    const readOrganizationalUnits = vi.fn().mockResolvedValue([
      {
        ...organizationalUnits[0]!,
        id: "fisc",
        isActive: false,
      },
    ]);
    const adapter = createMockEventProgramsAdapter({
      readGlobalRole: () => "ADMIN",
      readOrganizationalUnits,
    });

    await expect(
      adapter.createEventProgram!({ ...creationRequest, organizationalUnitId: "fisc" }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      adapter.createEventProgram!({ ...creationRequest, organizationalUnitId: "unknown" }),
    ).rejects.toMatchObject({ status: 400 });
    expect(readOrganizationalUnits).toHaveBeenCalled();
  });

  it("reads the active units of its own composition at creation time", async () => {
    let units = [...organizationalUnits];
    const adapter = createMockEventProgramsAdapter({
      readGlobalRole: () => "ADMIN",
      readOrganizationalUnits: () => Promise.resolve(units),
    });

    await adapter.createEventProgram!(creationRequest);

    units = units.map((unit) => ({ ...unit, isActive: false }));
    await expect(adapter.createEventProgram!(creationRequest)).rejects.toMatchObject({
      status: 400,
    });
  });

  it("updates an additional draft and publishes it with the contractual transition", async () => {
    const adapter = administratorAdapter();
    const created = await adapter.createEventProgram!(creationRequest);

    const updated = await adapter.updateEventProgram!(created.id, {
      description: "Descripcion editada",
      name: "Cierre Academico 2026",
    });
    expect(updated).toMatchObject({
      description: "Descripcion editada",
      name: "Cierre Academico 2026",
      status: "DRAFT",
    });

    const published = await adapter.updateEventProgram!(created.id, { status: "ACTIVE" });
    expect(published.status).toBe("ACTIVE");

    await expect(
      adapter.updateEventProgram!(created.id, { status: "ACTIVE" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects dates that would leave activities outside the range", async () => {
    const adapter = administratorAdapter();

    await expect(
      adapter.updateEventProgram!("program-innovation-week", { startDate: "2026-06-16" }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("rejects dates on the permanent agenda and edits to an archived program", async () => {
    const adapter = administratorAdapter();

    await expect(
      adapter.updateEventProgram!("program-fic-default", { startDate: "2026-06-15" }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      adapter.updateEventProgram!("program-robotics-competition-2024", { name: "Otro nombre" }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("archives an additional program, is idempotent and blocks the permanent agenda", async () => {
    const adapter = administratorAdapter();

    await expect(adapter.archiveEventProgram!("program-fic-default")).rejects.toMatchObject({
      status: 409,
    });

    const archived = await adapter.archiveEventProgram!("program-data-governance-workshop");
    expect(archived.status).toBe("ARCHIVED");
    await expect(
      adapter.archiveEventProgram!("program-data-governance-workshop"),
    ).resolves.toMatchObject({ status: "ARCHIVED" });

    await expect(adapter.archiveEventProgram!("program-innovation-week")).rejects.toMatchObject({
      status: 409,
    });
  });

  it("reactivates only an archived additional program", async () => {
    const adapter = administratorAdapter();

    const reactivated = await adapter.reactivateEventProgram!("program-robotics-competition-2024");
    expect(reactivated.status).toBe("ACTIVE");

    await expect(
      adapter.reactivateEventProgram!("program-robotics-competition-2024"),
    ).rejects.toMatchObject({ status: 409 });
    await expect(adapter.reactivateEventProgram!("program-fic-default")).rejects.toMatchObject({
      status: 409,
    });
  });

  it("rejects lifecycle mutations without an administrator role", async () => {
    const adapter = createMockEventProgramsAdapter({ readGlobalRole: () => "USER" });

    await expect(
      adapter.updateEventProgram!("program-innovation-week", { name: "Otro" }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      adapter.archiveEventProgram!("program-data-governance-workshop"),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      adapter.reactivateEventProgram!("program-robotics-competition-2024"),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("updates only the allowlisted fields of a program", async () => {
    const adapter = administratorAdapter();
    const injected = {
      description: null,
      isDefault: true,
      label: null,
      name: "Nombre permitido",
      organizationalUnitId: "fie",
      status: "ACTIVE",
    } as unknown as UpdateEventProgramRequest;

    const updated = await adapter.updateEventProgram!("program-data-governance-workshop", injected);

    expect(updated).toMatchObject({
      isDefault: false,
      name: "Nombre permitido",
      organizationalUnitId: "fisc",
      status: "ACTIVE",
    });

    await expect(
      adapter.updateEventProgram!("program-innovation-week", {
        status: "ARCHIVED",
      } as unknown as UpdateEventProgramRequest),
    ).rejects.toMatchObject({ status: 400 });
  });
});
