import { describe, expect, it, vi } from "vitest";

import { createApiActivityCatalogAdapter } from "./apiActivityCatalogAdapter";

const environment = { DEV: false, PROD: true, VITE_API_BASE_URL: "https://api.test" };

const unit = {
  code: "FIC",
  description: null,
  head: null,
  id: "fic",
  isActive: true,
  name: "Facultad de Ingenieria Civil",
  type: "FACULTY",
};

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

const classroom = {
  amenities: ["projector"],
  building: "Edificio de Aulas",
  capacity: 60,
  floor: 1,
  id: "classroom-1",
  isActive: true,
  name: "Aula 101",
  type: "CLASSROOM",
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

    if (url.includes("/api/v1/organizational-units")) {
      return Promise.resolve(jsonResponse(envelope([unit])));
    }

    if (url.includes("/api/v1/event-programs")) {
      return Promise.resolve(jsonResponse(envelope([program])));
    }

    if (url.includes("/api/v1/classrooms")) {
      return Promise.resolve(jsonResponse(envelope([classroom])));
    }

    if (url.includes("/api/v1/activities/activity-1")) {
      return Promise.resolve(jsonResponse({ data: activity, message: "ok", success: true }));
    }

    return Promise.resolve(jsonResponse({ message: "not found", success: false }, 404));
  });
}

describe("createApiActivityCatalogAdapter", () => {
  it("should map the public catalog from the OpenAPI contract", async () => {
    const catalog = await createApiActivityCatalogAdapter({
      environment,
      fetcher: createFetcher(),
    }).loadCatalog();

    expect(catalog.organizationalUnits).toEqual([
      expect.objectContaining({ id: "fic", type: "FACULTY" }),
    ]);
    expect(catalog.eventPrograms).toEqual([
      expect.objectContaining({ id: "program-1", organizationalUnitId: "fic" }),
    ]);
    expect(catalog.classrooms).toEqual([expect.objectContaining({ id: "classroom-1" })]);
    expect(catalog.activities).toEqual([
      expect.objectContaining({
        classroomId: "classroom-1",
        enrolledCount: 20,
        eventProgramId: "program-1",
        id: "activity-1",
      }),
    ]);
  });

  it("should read every paginated page", async () => {
    const fetcher = vi.fn((input: RequestInfo | URL) => {
      const url = toUrl(input);

      if (url.includes("/api/v1/organizational-units")) {
        return Promise.resolve(
          url.includes("page=2")
            ? jsonResponse(envelope([{ ...unit, code: "FIE", id: "fie" }], 2, 2))
            : jsonResponse(envelope([unit], 2, 1)),
        );
      }

      if (url.includes("/api/v1/event-programs")) {
        return Promise.resolve(jsonResponse(envelope([])));
      }

      if (url.includes("/api/v1/classrooms")) {
        return Promise.resolve(jsonResponse(envelope([])));
      }

      return Promise.resolve(jsonResponse({ message: "not found", success: false }, 404));
    });

    const catalog = await createApiActivityCatalogAdapter({ environment, fetcher }).loadCatalog();

    expect(catalog.organizationalUnits.map((candidate) => candidate.id)).toEqual(["fic", "fie"]);
  });

  it("should send the bearer token provided by the session", async () => {
    const fetcher = createFetcher();

    await createApiActivityCatalogAdapter({
      environment,
      fetcher,
      getAccessToken: () => "access-token",
    }).loadCatalog();

    const authorizedRequests = fetcher.mock.calls.filter(([, requestInit]) =>
      new Headers(requestInit?.headers).has("Authorization"),
    );

    expect(authorizedRequests.length).toBe(fetcher.mock.calls.length);

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

      if (url.includes("/api/v1/organizational-units")) {
        return Promise.resolve(jsonResponse(envelope([unit])));
      }

      if (url.includes("/api/v1/event-programs")) {
        return Promise.resolve(jsonResponse(envelope([program])));
      }

      if (url.includes("/api/v1/classrooms")) {
        return Promise.resolve(jsonResponse(envelope([classroom])));
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
      createApiActivityCatalogAdapter({ environment, fetcher }).loadCatalog(),
    ).rejects.toThrow(/type/);
  });

  it("should propagate HTTP failures", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(jsonResponse({ message: "boom", success: false }, 500)),
    );

    await expect(
      createApiActivityCatalogAdapter({ environment, fetcher }).loadCatalog(),
    ).rejects.toThrow("Ocurrio un error en el servidor. Intenta de nuevo.");
  });
});
