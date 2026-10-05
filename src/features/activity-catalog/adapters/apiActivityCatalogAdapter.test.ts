// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { createApiActivityCatalogAdapter } from "./apiActivityCatalogAdapter";

const environment = { DEV: false, PROD: true, VITE_API_BASE_URL: "https://api.test" };

const program = {
  bannerUrl: null,
  description: null,
  endDate: "2026-06-19",
  id: "program-1",
  isDefault: false,
  label: "Semana de innovacion",
  name: "Semana de Innovacion Academica",
  organizationalUnit: { id: "fic", name: "Facultad de Ingenieria Civil", type: "FACULTY" },
  startDate: "2026-06-15",
  status: "ACTIVE",
};

const activity = {
  bannerUrl: null,
  cancelReason: null,
  capacity: 40,
  checkedInCount: 3,
  classroom: { building: "Edificio de Aulas", id: "classroom-1", name: "Aula 101" },
  date: "2026-06-15",
  description: null,
  endTime: "11:00",
  enrolledCount: 20,
  equipment: ["Proyector"],
  eventProgram: { id: "program-1", label: "Semana de innovacion", name: "Semana" },
  id: "activity-1",
  name: "Actividad uno",
  organizationalUnit: { id: "fic", name: "Facultad de Ingenieria Civil", type: "FACULTY" },
  speakers: [{ firstName: "Ana", id: "speaker-1", lastName: "Perez" }],
  startTime: "09:00",
  status: "SCHEDULED",
  type: "TALK",
};

function envelope(items: unknown[], totalPages = 1, page = 1) {
  return {
    data: { items, limit: 50, page, total: items.length, totalPages },
    message: "ok",
    success: true,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

function toUrl(input: RequestInfo | URL) {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.href;
  }

  return input.url;
}

function createFetcher() {
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    void init;
    const url = toUrl(input);

    if (url.includes("/api/v1/event-programs/program-1/activities")) {
      return Promise.resolve(jsonResponse(envelope([{ id: "activity-1" }])));
    }

    if (url.includes("/api/v1/event-programs")) {
      return Promise.resolve(jsonResponse(envelope([program])));
    }

    if (url.includes("/api/v1/activities/activity-1")) {
      return Promise.resolve(jsonResponse({ data: activity, message: "ok", success: true }));
    }

    return Promise.resolve(jsonResponse({ message: "not found", success: false }, 404));
  });
}

describe("createApiActivityCatalogAdapter", () => {
  it("should map programs and activities from the OpenAPI contract", async () => {
    const catalog = await createApiActivityCatalogAdapter({
      environment,
      fetcher: createFetcher(),
    }).loadCatalog("public");

    expect(catalog.eventPrograms).toEqual([
      expect.objectContaining({ id: "program-1", organizationalUnitId: "fic" }),
    ]);
    expect(catalog.activities).toEqual([
      expect.objectContaining({
        classroomId: "classroom-1",
        enrolledCount: 20,
        eventProgramId: "program-1",
        id: "activity-1",
      }),
    ]);
  });

  it("should not request the catalog endpoints owned by other resources", async () => {
    const fetcher = createFetcher();

    await createApiActivityCatalogAdapter({ environment, fetcher }).loadCatalog("public");

    for (const [input] of fetcher.mock.calls) {
      const url = toUrl(input);

      expect(url).not.toContain("/api/v1/organizational-units");
      expect(url).not.toContain("/api/v1/classrooms");
    }
  });

  it("should read every paginated page", async () => {
    const fetcher = vi.fn((input: RequestInfo | URL) => {
      const url = toUrl(input);

      if (url.includes("/api/v1/event-programs/program-2/activities")) {
        return Promise.resolve(jsonResponse(envelope([])));
      }

      if (url.includes("/api/v1/event-programs/program-1/activities")) {
        return Promise.resolve(jsonResponse(envelope([{ id: "activity-1" }])));
      }

      if (url.includes("/api/v1/event-programs")) {
        return Promise.resolve(
          url.includes("page=2")
            ? jsonResponse(envelope([{ ...program, id: "program-2" }], 2, 2))
            : jsonResponse(envelope([program], 2, 1)),
        );
      }

      if (url.includes("/api/v1/activities/activity-1")) {
        return Promise.resolve(jsonResponse({ data: activity, message: "ok", success: true }));
      }

      return Promise.resolve(jsonResponse({ message: "not found", success: false }, 404));
    });

    const catalog = await createApiActivityCatalogAdapter({ environment, fetcher }).loadCatalog(
      "public",
    );

    expect(catalog.eventPrograms.map((candidate) => candidate.id)).toEqual([
      "program-1",
      "program-2",
    ]);
    expect(catalog.activities).toHaveLength(1);
  });

  it("should never send a bearer token for public access even when a session exists", async () => {
    const fetcher = createFetcher();
    const readAccessToken = vi.fn(() => "access-token");

    await createApiActivityCatalogAdapter({ environment, fetcher }, readAccessToken).loadCatalog(
      "public",
    );

    expect(readAccessToken).not.toHaveBeenCalled();

    for (const [, requestInit] of fetcher.mock.calls) {
      expect(new Headers(requestInit?.headers).get("Authorization")).toBeNull();
    }
  });

  it("should resolve the token once and authorize every administrative request", async () => {
    const fetcher = createFetcher();
    const readAccessToken = vi.fn(() => "access-token");

    await createApiActivityCatalogAdapter({ environment, fetcher }, readAccessToken).loadCatalog(
      "administrative",
    );

    expect(readAccessToken).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalled();
    for (const [, requestInit] of fetcher.mock.calls) {
      expect(new Headers(requestInit?.headers).get("Authorization")).toBe("Bearer access-token");
    }
  });

  it("should fail when an activity payload is outside the contract", async () => {
    const fetcher = vi.fn((input: RequestInfo | URL) => {
      const url = toUrl(input);

      if (url.includes("/api/v1/event-programs/program-1/activities")) {
        return Promise.resolve(jsonResponse(envelope([{ id: "activity-1" }])));
      }

      if (url.includes("/api/v1/event-programs")) {
        return Promise.resolve(jsonResponse(envelope([program])));
      }

      if (url.includes("/api/v1/activities/activity-1")) {
        return Promise.resolve(
          jsonResponse({
            data: { ...activity, type: "FESTIVAL" },
            message: "ok",
            success: true,
          }),
        );
      }

      return Promise.resolve(jsonResponse({ message: "not found", success: false }, 404));
    });

    await expect(
      createApiActivityCatalogAdapter({ environment, fetcher }).loadCatalog("public"),
    ).rejects.toThrow(/type/);
  });

  it("should propagate HTTP failures", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(jsonResponse({ message: "boom", success: false }, 500)),
    );

    await expect(
      createApiActivityCatalogAdapter({ environment, fetcher }).loadCatalog("public"),
    ).rejects.toThrow("Ocurrio un error en el servidor. Intente de nuevo.");
  });
});
