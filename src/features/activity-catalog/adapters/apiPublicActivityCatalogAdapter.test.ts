import { describe, expect, it, vi } from "vitest";

import { createApiPublicActivityCatalogAdapter } from "./apiPublicActivityCatalogAdapter";

const environment = { DEV: false, PROD: true, VITE_API_BASE_URL: "https://api.test" };

const activity = {
  bannerUrl: null,
  capacity: 24,
  classroom: { building: "Edificio 2", id: "classroom-1", name: "Laboratorio de Electronica" },
  date: "2026-10-12",
  description: "Taller practico",
  endTime: "12:00",
  eventProgram: {
    id: "program-1",
    label: "Semana de innovacion",
    name: "Semana de Innovacion Academica",
  },
  id: "activity-1",
  name: "Actividad publica",
  organizationalUnit: { id: "fic", name: "Facultad de Ingenieria Civil", type: "FACULTY" },
  speakers: [{ firstName: "Ana", id: "speaker-1", lastName: "Perez" }],
  startTime: "09:00",
  type: "WORKSHOP",
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

/**
 * Fetcher que responde siempre con la misma pagina. Se declara con la firma de
 * `fetch` completa porque el test inspecciona `mock.calls`, y una tupla vacia
 * haria imposible leer las peticiones registradas.
 */
function singlePageFetcher(body: unknown, status = 200) {
  return vi.fn((_input: RequestInfo | URL, _init?: RequestInit) => {
    void _input;
    void _init;

    return Promise.resolve(jsonResponse(body, status));
  });
}

describe("createApiPublicActivityCatalogAdapter", () => {
  it("should read the whole agenda with a single request when it fits one page", async () => {
    const fetcher = singlePageFetcher(envelope([activity]));

    const catalog = await createApiPublicActivityCatalogAdapter({
      environment,
      fetcher,
    }).loadPublicActivities();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(toUrl(fetcher.mock.calls[0]![0])).toBe(
      "https://api.test/api/v1/activities?page=1&limit=50",
    );
    expect(catalog.activities).toEqual([
      expect.objectContaining({ id: "activity-1", name: "Actividad publica" }),
    ]);
  });

  it("should read every page when the agenda does not fit in one", async () => {
    const fetcher = vi.fn((input: RequestInfo | URL) => {
      const url = toUrl(input);

      return Promise.resolve(
        jsonResponse(
          url.includes("page=2")
            ? envelope([{ ...activity, id: "activity-2" }], 2, 2)
            : envelope([activity], 2, 1),
        ),
      );
    });

    const catalog = await createApiPublicActivityCatalogAdapter({
      environment,
      fetcher,
    }).loadPublicActivities();

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(catalog.activities.map((candidate) => candidate.id)).toEqual([
      "activity-1",
      "activity-2",
    ]);
  });

  it("should never read units, programs or classrooms separately", async () => {
    const fetcher = singlePageFetcher(envelope([activity]));

    await createApiPublicActivityCatalogAdapter({ environment, fetcher }).loadPublicActivities();

    for (const [input] of fetcher.mock.calls) {
      const url = toUrl(input);

      expect(url).toContain("/api/v1/activities");
      expect(url).not.toContain("/organizational-units");
      expect(url).not.toContain("/event-programs");
      expect(url).not.toContain("/classrooms");
    }
  });

  it("should never request an activity detail", async () => {
    const fetcher = singlePageFetcher(envelope([activity]));

    await createApiPublicActivityCatalogAdapter({ environment, fetcher }).loadPublicActivities();

    for (const [input] of fetcher.mock.calls) {
      expect(toUrl(input)).not.toContain("/api/v1/activities/activity-1");
    }
  });

  it("should never send credentials, because the listing is anonymous", async () => {
    const fetcher = singlePageFetcher(envelope([activity]));

    await createApiPublicActivityCatalogAdapter({ environment, fetcher }).loadPublicActivities();

    for (const [, requestInit] of fetcher.mock.calls) {
      expect(new Headers(requestInit?.headers).get("Authorization")).toBeNull();
    }
  });

  it("should keep the embedded classroom, program and unit instead of resolving them", async () => {
    const fetcher = singlePageFetcher(envelope([activity]));

    const catalog = await createApiPublicActivityCatalogAdapter({
      environment,
      fetcher,
    }).loadPublicActivities();
    const [mapped] = catalog.activities;

    expect(mapped?.classroom).toEqual({
      building: "Edificio 2",
      id: "classroom-1",
      name: "Laboratorio de Electronica",
    });
    expect(mapped?.program).toEqual({
      id: "program-1",
      isDefault: false,
      label: "Semana de innovacion",
      name: "Semana de Innovacion Academica",
    });
    expect(mapped?.unit).toEqual({
      backendId: "fic",
      name: "Facultad de Ingenieria Civil",
      type: "FACULTY",
    });
  });

  it("should accept an activity without a classroom", async () => {
    const fetcher = singlePageFetcher(envelope([{ ...activity, classroom: null }]));

    const catalog = await createApiPublicActivityCatalogAdapter({
      environment,
      fetcher,
    }).loadPublicActivities();

    expect(catalog.activities[0]?.classroom).toBeNull();
  });

  it("should recognize a default program from its name in either wording", async () => {
    const fetcher = vi.fn((input: RequestInfo | URL) => {
      const url = toUrl(input);
      const name = url.includes("page=2")
        ? "Programa de Eventos de Subdireccion Academica"
        : "Programa de Eventos - Facultad de Ingenieria Civil";

      return Promise.resolve(
        jsonResponse(
          envelope(
            [{ ...activity, eventProgram: { id: "p", label: null, name } }],
            2,
            url.includes("page=2") ? 2 : 1,
          ),
        ),
      );
    });

    const catalog = await createApiPublicActivityCatalogAdapter({
      environment,
      fetcher,
    }).loadPublicActivities();

    expect(catalog.activities.map((candidate) => candidate.program.isDefault)).toEqual([
      true,
      true,
    ]);
  });

  it("should fail when an activity payload is outside the contract", async () => {
    const fetcher = singlePageFetcher(envelope([{ ...activity, type: "FESTIVAL" }]));

    await expect(
      createApiPublicActivityCatalogAdapter({ environment, fetcher }).loadPublicActivities(),
    ).rejects.toThrow(/type/);
  });

  it("should propagate HTTP failures", async () => {
    const fetcher = singlePageFetcher({ message: "boom", success: false }, 500);

    await expect(
      createApiPublicActivityCatalogAdapter({ environment, fetcher }).loadPublicActivities(),
    ).rejects.toThrow("Ocurrio un error en el servidor. Intente de nuevo.");
  });
});
