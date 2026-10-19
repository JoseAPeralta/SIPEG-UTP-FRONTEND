// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import {
  createApiActivityCatalogAdapter as createCatalogAdapter,
  type ApiActivityCatalogAdapterOptions,
} from "./apiActivityCatalogAdapter";
import { createApiEventProgramsAdapter } from "@/features/event-programs";
import { createEventProgram } from "@/test/factories";

const environment = { DEV: false, PROD: true, VITE_API_BASE_URL: "https://api.test" };

function createApiActivityCatalogAdapter(
  options: ApiActivityCatalogAdapterOptions,
  readToken: () => string | null = () => "access-token",
) {
  return createCatalogAdapter(
    createApiEventProgramsAdapter(options, readToken),
    options,
    readToken,
  );
}

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

function activityItem(overrides: Record<string, unknown> = {}) {
  return {
    bannerUrl: null,
    capacity: 40,
    classroom: { building: "Edificio de Aulas", id: "classroom-1", name: "Aula 101" },
    date: "2026-06-15",
    description: null,
    endTime: "11:00",
    eventProgram: { id: "program-1", label: "Semana de innovacion", name: "Semana" },
    id: "activity-1",
    name: "Actividad uno",
    organizationalUnit: { id: "fic", name: "Facultad de Ingenieria Civil", type: "FACULTY" },
    speakers: [{ firstName: "Ana", id: "speaker-1", lastName: "Perez" }],
    startTime: "09:00",
    status: "SCHEDULED",
    type: "TALK",
    ...overrides,
  };
}

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

function authorizationOf(requestInit: RequestInit | undefined) {
  return new Headers(requestInit?.headers).get("Authorization");
}

function createFetcher(activityItems: unknown[] = [activityItem()]) {
  return vi.fn((input: RequestInfo | URL, _init?: RequestInit) => {
    void _init;
    const url = new URL(toUrl(input));

    if (url.pathname.endsWith("/activities")) {
      return Promise.resolve(jsonResponse(envelope(activityItems)));
    }

    if (url.pathname === "/api/v1/event-programs") {
      return Promise.resolve(jsonResponse(envelope([program])));
    }

    return Promise.resolve(jsonResponse({ message: "not found", success: false }, 404));
  });
}

describe("createApiActivityCatalogAdapter", () => {
  it("should compose injected programs through the administrative read", async () => {
    const programs = {
      loadEventPrograms: vi.fn().mockResolvedValue([createEventProgram({ id: "program-1" })]),
    };
    const fetcher = createFetcher();
    const catalog = await createCatalogAdapter(
      programs,
      { environment, fetcher },
      () => "access-token",
    ).loadCatalog();

    expect(programs.loadEventPrograms).toHaveBeenCalledWith("administrative");
    expect(catalog.activities).toHaveLength(1);
    expect(fetcher.mock.calls.map(([input]) => toUrl(input))).toEqual([
      "https://api.test/api/v1/event-programs/program-1/activities?page=1&limit=50",
    ]);
  });

  it("should map each program listing page to activity summaries", async () => {
    const fetcher = createFetcher([
      activityItem({
        cancelReason: "No aplica",
        checkedInCount: 3,
        enrolledCount: 20,
        equipment: ["Proyector"],
      }),
    ]);
    const catalog = await createApiActivityCatalogAdapter({
      environment,
      fetcher,
    }).loadCatalog();

    expect(catalog.eventPrograms).toEqual([
      expect.objectContaining({ id: "program-1", organizationalUnitId: "fic" }),
    ]);
    expect(catalog.activities).toEqual([
      expect.objectContaining({
        classroomId: "classroom-1",
        eventProgramId: "program-1",
        id: "activity-1",
      }),
    ]);

    for (const field of ["cancelReason", "checkedInCount", "enrolledCount", "equipment"]) {
      expect(catalog.activities[0]).not.toHaveProperty(field);
    }
  });

  it("should never request an activity detail", async () => {
    const fetcher = createFetcher();

    await createApiActivityCatalogAdapter({ environment, fetcher }).loadCatalog();

    expect(fetcher.mock.calls.length).toBeGreaterThan(0);
    for (const [input] of fetcher.mock.calls) {
      expect(new URL(toUrl(input)).pathname).toMatch(/^\/api\/v1\/event-programs/);
    }
  });

  it.each([0, 1, 50, 51, 120])(
    "should read %i activity summaries with only the program listing pages",
    async (activityCount) => {
      const totalPages = activityCount === 0 ? 0 : Math.ceil(activityCount / 50);
      const fetcher = vi.fn((input: RequestInfo | URL) => {
        const url = new URL(toUrl(input));

        if (url.pathname === "/api/v1/event-programs/program-1/activities") {
          const page = Number(url.searchParams.get("page") ?? "1");
          const start = (page - 1) * 50;
          const items = Array.from(
            { length: Math.max(0, Math.min(50, activityCount - start)) },
            (_, index) => activityItem({ id: `activity-${start + index + 1}` }),
          );

          return Promise.resolve(jsonResponse(envelope(items, totalPages, page)));
        }

        if (url.pathname === "/api/v1/event-programs") {
          return Promise.resolve(jsonResponse(envelope([program])));
        }

        return Promise.resolve(jsonResponse({ message: "not found", success: false }, 404));
      });

      const catalog = await createApiActivityCatalogAdapter({
        environment,
        fetcher,
      }).loadCatalog();

      expect(catalog.activities).toHaveLength(activityCount);
      expect(fetcher).toHaveBeenCalledTimes(Math.max(1, totalPages) + 1);

      const activityRequests = fetcher.mock.calls.filter(([input]) =>
        new URL(toUrl(input)).pathname.endsWith("/activities"),
      );

      expect(activityRequests).toHaveLength(Math.max(1, totalPages));
      for (const [input] of activityRequests) {
        expect(new URL(toUrl(input)).pathname).toBe("/api/v1/event-programs/program-1/activities");
      }
    },
  );

  it("should request every listing with status=ALL in the all-programs mode", async () => {
    const fetcher = createFetcher();

    const catalog = await createApiActivityCatalogAdapter({ environment, fetcher }).loadCatalog(
      "all-programs",
    );

    const urls = fetcher.mock.calls.map(([input]) => new URL(toUrl(input)));
    const programListings = urls.filter((url) => url.pathname === "/api/v1/event-programs");
    const activityListings = urls.filter((url) => url.pathname.endsWith("/activities"));

    expect(programListings).toHaveLength(1);
    expect(activityListings).toHaveLength(1);
    for (const url of [...programListings, ...activityListings]) {
      expect(url.searchParams.get("status")).toBe("ALL");
    }
    expect(catalog.activities).toHaveLength(1);
  });

  it("omits status=ALL from every listing in the active-programs mode", async () => {
    const fetcher = createFetcher();

    await createApiActivityCatalogAdapter({ environment, fetcher }).loadCatalog();

    const listingUrls = fetcher.mock.calls
      .map(([input]) => toUrl(input))
      .filter((url) => url.includes("/api/v1/event-programs"));
    expect(listingUrls.length).toBeGreaterThan(0);
    expect(listingUrls.some((url) => url.includes("status="))).toBe(false);
  });

  it("should not request the catalog endpoints owned by other resources", async () => {
    const fetcher = createFetcher();

    await createApiActivityCatalogAdapter({ environment, fetcher }).loadCatalog();

    for (const [input] of fetcher.mock.calls) {
      const url = toUrl(input);

      expect(url).not.toContain("/api/v1/organizational-units");
      expect(url).not.toContain("/api/v1/classrooms");
    }
  });

  it("should read every paginated page of activities and programs", async () => {
    const fetcher = vi.fn((input: RequestInfo | URL) => {
      const url = new URL(toUrl(input));
      const page = url.searchParams.get("page");

      if (url.pathname === "/api/v1/event-programs/program-1/activities") {
        return Promise.resolve(jsonResponse(envelope([activityItem()], 1, 1)));
      }

      if (url.pathname === "/api/v1/event-programs/program-2/activities") {
        return Promise.resolve(
          jsonResponse(
            page === "2"
              ? envelope([activityItem({ id: "activity-3" })], 2, 2)
              : envelope([activityItem({ id: "activity-2" })], 2, 1),
          ),
        );
      }

      if (url.pathname === "/api/v1/event-programs") {
        return Promise.resolve(
          page === "2"
            ? jsonResponse(envelope([], 2, 2))
            : jsonResponse(envelope([program, { ...program, id: "program-2" }], 2, 1)),
        );
      }

      return Promise.resolve(jsonResponse({ message: "not found", success: false }, 404));
    });

    const catalog = await createApiActivityCatalogAdapter({ environment, fetcher }).loadCatalog();

    expect(catalog.eventPrograms.map((candidate) => candidate.id)).toEqual([
      "program-1",
      "program-2",
    ]);
    expect(catalog.activities.map((candidate) => candidate.id)).toEqual([
      "activity-1",
      "activity-2",
      "activity-3",
    ]);
  });

  it("should authorize every request with the current bearer", async () => {
    const fetcher = createFetcher();
    const readAccessToken = vi.fn(() => "access-token");

    await createApiActivityCatalogAdapter({ environment, fetcher }, readAccessToken).loadCatalog();

    expect(fetcher).toHaveBeenCalledTimes(2);

    for (const [, requestInit] of fetcher.mock.calls) {
      expect(authorizationOf(requestInit)).toBe("Bearer access-token");
    }
  });

  it("should read the access token on every operation", async () => {
    const fetcher = createFetcher();
    const readAccessToken = vi
      .fn<() => string | null>()
      .mockReturnValueOnce("programs-token")
      .mockReturnValueOnce("activities-token");

    await createApiActivityCatalogAdapter({ environment, fetcher }, readAccessToken).loadCatalog();

    expect(fetcher.mock.calls.map(([, requestInit]) => authorizationOf(requestInit))).toEqual([
      "Bearer programs-token",
      "Bearer activities-token",
    ]);
  });

  it("should never issue a request without a session token", async () => {
    const fetcher = createFetcher();

    await expect(
      createApiActivityCatalogAdapter({ environment, fetcher }, () => null).loadCatalog(),
    ).rejects.toThrow(/sesion/i);

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("should fail when an activity payload is outside the contract", async () => {
    const fetcher = createFetcher([activityItem({ type: "FESTIVAL" })]);

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
    ).rejects.toThrow("Ocurrio un error en el servidor. Intente de nuevo.");
  });
});
