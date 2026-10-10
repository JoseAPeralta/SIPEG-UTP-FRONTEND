// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { createEventProgram } from "@/test/factories";
import type {
  CreateEventProgramRequest,
  UpdateEventProgramRequest,
} from "../model/eventProgramRequests";
import { createApiEventProgramsAdapter } from "./apiEventProgramsAdapter";

const environment = { DEV: false, PROD: true, VITE_API_BASE_URL: "https://api.test" };
const program = {
  ...createEventProgram(),
  organizationalUnit: { id: "unit-1", name: "Facultad", type: "FACULTY" },
};
function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  return input instanceof URL ? input.href : input.url;
}

function response(items: unknown[], totalPages = 1, page = 1) {
  return new Response(
    JSON.stringify({
      success: true,
      message: "ok",
      data: { items, page, limit: 50, total: items.length, totalPages },
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}

describe("createApiEventProgramsAdapter", () => {
  it("loads all pages without requesting activities or reference catalogs", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response([program], 2));
    fetcher
      .mockResolvedValueOnce(response([program], 2, 1))
      .mockResolvedValueOnce(response([{ ...program, id: "program-2" }], 2, 2));
    const programs = await createApiEventProgramsAdapter({
      environment,
      fetcher,
    }).loadEventPrograms("public");
    expect(programs.map((item) => item.id)).toEqual([program.id, "program-2"]);
    expect(
      fetcher.mock.calls.map(([input]) =>
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
      ),
    ).toEqual([
      "https://api.test/api/v1/event-programs?page=1&limit=50",
      "https://api.test/api/v1/event-programs?page=2&limit=50",
    ]);
  });

  it("requests every administrative page with status=ALL when asked", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response([program], 2));
    fetcher
      .mockResolvedValueOnce(response([program], 2, 1))
      .mockResolvedValueOnce(response([{ ...program, id: "program-2" }], 2, 2));
    const readToken = vi.fn(() => "admin-token");

    const programs = await createApiEventProgramsAdapter(
      { environment, fetcher },
      readToken,
    ).loadEventPrograms("administrative", "ALL");

    expect(programs.map((item) => item.id)).toEqual([program.id, "program-2"]);
    const urls = fetcher.mock.calls.map(([input]) => new URL(requestUrl(input)));
    expect(urls.map((url) => url.searchParams.get("status"))).toEqual(["ALL", "ALL"]);
    expect(urls.map((url) => url.searchParams.get("page"))).toEqual(["1", "2"]);
    expect(
      fetcher.mock.calls.map(([, init]) => new Headers(init?.headers).get("Authorization")),
    ).toEqual(["Bearer admin-token", "Bearer admin-token"]);
  });

  it("omits the status parameter when it is not requested", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response([program]));

    await createApiEventProgramsAdapter({ environment, fetcher }, () => "token").loadEventPrograms(
      "administrative",
    );

    const [input] = fetcher.mock.calls[0]!;
    const url = new URL(requestUrl(input));
    expect(url.searchParams.has("status")).toBe(false);
    expect(url.searchParams.toString()).toBe("page=1&limit=50");
  });

  it("requests one filtered page with the administrative credential", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response([program]));
    const readToken = vi.fn(() => "admin-token");
    const adapter = createApiEventProgramsAdapter({ environment, fetcher }, readToken);

    const result = await adapter.loadEventProgramsPage!(
      { organizationalUnitId: "unidad / 1", q: "innovacion academica", status: "ALL" },
      2,
    );

    const [input, init] = fetcher.mock.calls[0]!;
    const url = new URL(requestUrl(input));
    expect(url.pathname).toBe("/api/v1/event-programs");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      limit: "20",
      organizationalUnitId: "unidad / 1",
      page: "2",
      q: "innovacion academica",
      status: "ALL",
    });
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer admin-token");
    expect(result.items[0]?.organizationalUnit).toEqual({
      id: "unit-1",
      name: "Facultad",
      type: "FACULTY",
    });
    expect(result).toMatchObject({ limit: 50, page: 1, total: 1, totalPages: 1 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("omits absent filters and reads the current token on each page operation", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(() => Promise.resolve(response([program])));
    const readToken = vi
      .fn()
      .mockReturnValueOnce("first-token")
      .mockReturnValueOnce("rotated-token");
    const adapter = createApiEventProgramsAdapter({ environment, fetcher }, readToken);

    await adapter.loadEventProgramsPage!({}, 1);
    await adapter.loadEventProgramsPage!({}, 1);

    const [firstInput] = fetcher.mock.calls[0]!;
    expect(new URL(requestUrl(firstInput)).searchParams.toString()).toBe("limit=20&page=1");
    expect(
      fetcher.mock.calls.map(([, init]) => new Headers(init?.headers).get("Authorization")),
    ).toEqual(["Bearer first-token", "Bearer rotated-token"]);
  });

  it("propagates the invalid status response of the page operation", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ success: false, message: "invalid", errors: [] }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(
      createApiEventProgramsAdapter({ environment, fetcher }, () => "token").loadEventProgramsPage!(
        { status: "ALL" },
        1,
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("never reads or sends a session credential for public access", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response([]));
    const readToken = vi.fn(() => "private-token");
    await expect(
      createApiEventProgramsAdapter({ environment, fetcher }, readToken).loadEventPrograms(
        "public",
      ),
    ).resolves.toEqual([]);
    expect(readToken).not.toHaveBeenCalled();
    expect(new Headers(fetcher.mock.calls[0]?.[1]?.headers).get("Authorization")).toBeNull();
  });

  it("reads the current token for each administrative operation", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(() => Promise.resolve(response([program])));
    const readToken = vi
      .fn()
      .mockReturnValueOnce("first-token")
      .mockReturnValueOnce("rotated-token");
    const adapter = createApiEventProgramsAdapter({ environment, fetcher }, readToken);
    await adapter.loadEventPrograms("administrative");
    await adapter.loadEventPrograms("administrative");
    expect(
      fetcher.mock.calls.map(([, init]) => new Headers(init?.headers).get("Authorization")),
    ).toEqual(["Bearer first-token", "Bearer rotated-token"]);
  });

  it("rejects invalid successful payloads", async () => {
    const fetcher = vi.fn(() => Promise.resolve(response([{ ...program, status: "PAUSED" }])));
    await expect(
      createApiEventProgramsAdapter({ environment, fetcher }).loadEventPrograms("public"),
    ).rejects.toThrow(/status/);
  });

  it("propagates HTTP failures without a mock fallback", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ success: false, message: "internal detail", errors: [] }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    await expect(
      createApiEventProgramsAdapter({ environment, fetcher }, () => "token").loadEventPrograms(
        "administrative",
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("creates a program with the allowlisted body and the current token", async () => {
    const fetcher = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        new Response(JSON.stringify({ data: program, message: "created", success: true }), {
          headers: { "Content-Type": "application/json" },
          status: 201,
        }),
      ),
    );
    const readToken = vi.fn(() => "admin-token");
    const request = {
      description: null,
      endDate: "2026-06-19",
      id: "injected-id",
      isDefault: true,
      label: null,
      name: "Programa creado",
      organizationalUnitId: "unit-1",
      startDate: "2026-06-15",
      status: "ACTIVE",
    } as unknown as CreateEventProgramRequest;

    const created = await createApiEventProgramsAdapter({ environment, fetcher }, readToken)
      .createEventProgram!(request);

    const [input, init] = fetcher.mock.calls[0]!;
    expect(requestUrl(input)).toBe("https://api.test/api/v1/event-programs");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer admin-token");
    const body = init?.body;
    if (typeof body !== "string") throw new Error("El cuerpo de creación debe ser texto JSON.");
    expect(JSON.parse(body)).toEqual({
      description: null,
      endDate: "2026-06-19",
      label: null,
      name: "Programa creado",
      organizationalUnitId: "unit-1",
      startDate: "2026-06-15",
    });
    expect(created).toEqual(createEventProgram({ organizationalUnitId: "unit-1" }));
  });

  it("propagates a rejected creation without exposing the backend message", async () => {
    const fetcher = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ errors: [], message: "inactive unit detail", success: false }),
          {
            headers: { "Content-Type": "application/json" },
            status: 400,
          },
        ),
      ),
    );
    await expect(
      createApiEventProgramsAdapter({ environment, fetcher }, () => "token").createEventProgram!({
        description: null,
        endDate: "2026-06-19",
        label: null,
        name: "Programa",
        organizationalUnitId: "unit-1",
        startDate: "2026-06-15",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects an invalid created payload", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            data: { ...program, status: "PAUSED" },
            message: "created",
            success: true,
          }),
          { headers: { "Content-Type": "application/json" }, status: 201 },
        ),
      ),
    );
    await expect(
      createApiEventProgramsAdapter({ environment, fetcher }, () => "token").createEventProgram!({
        description: null,
        endDate: "2026-06-19",
        label: null,
        name: "Programa",
        organizationalUnitId: "unit-1",
        startDate: "2026-06-15",
      }),
    ).rejects.toThrow(/status/);
  });

  it("updates a program with the allowlisted body and the current token", async () => {
    const fetcher = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        new Response(JSON.stringify({ data: program, message: "updated", success: true }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }),
      ),
    );
    const readToken = vi.fn(() => "admin-token");
    const injected = {
      bannerUrl: null,
      description: "Nueva descripcion",
      endDate: "2026-06-20",
      injected: "private",
      isDefault: true,
      name: "Programa actualizado",
      organizationalUnitId: "unit-2",
      startDate: "2026-06-10",
      status: "ACTIVE",
    } as unknown as UpdateEventProgramRequest;

    const updated = await createApiEventProgramsAdapter({ environment, fetcher }, readToken)
      .updateEventProgram!("program / 1", injected);

    const [input, init] = fetcher.mock.calls[0]!;
    expect(requestUrl(input)).toBe("https://api.test/api/v1/event-programs/program%20%2F%201");
    expect(init?.method).toBe("PATCH");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer admin-token");
    const body = init?.body;
    if (typeof body !== "string") throw new Error("El parche debe ser texto JSON.");
    expect(JSON.parse(body)).toEqual({
      bannerUrl: null,
      description: "Nueva descripcion",
      endDate: "2026-06-20",
      name: "Programa actualizado",
      startDate: "2026-06-10",
      status: "ACTIVE",
    });
    expect(updated).toEqual(createEventProgram({ organizationalUnitId: "unit-1" }));
  });

  it("archives and reactivates through their explicit POST endpoints", async () => {
    const fetcher = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        new Response(JSON.stringify({ data: program, message: "done", success: true }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }),
      ),
    );
    const adapter = createApiEventProgramsAdapter({ environment, fetcher }, () => "token");

    await adapter.archiveEventProgram!("program 1");
    await adapter.reactivateEventProgram!("program 1");

    expect(fetcher.mock.calls.map(([input]) => requestUrl(input))).toEqual([
      "https://api.test/api/v1/event-programs/program%201/archive",
      "https://api.test/api/v1/event-programs/program%201/reactivate",
    ]);
    expect(fetcher.mock.calls.map(([, init]) => init?.method)).toEqual(["POST", "POST"]);
    expect(fetcher.mock.calls.map(([, init]) => init?.body)).toEqual([undefined, undefined]);
  });

  it("rejects an invalid updated payload and propagates a lifecycle conflict", async () => {
    const invalid = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            data: { ...program, status: "PAUSED" },
            message: "updated",
            success: true,
          }),
          { headers: { "Content-Type": "application/json" }, status: 200 },
        ),
      ),
    );
    await expect(
      createApiEventProgramsAdapter({ environment, fetcher: invalid }, () => "token")
        .updateEventProgram!("program-1", { name: "Programa" }),
    ).rejects.toThrow(/status/);

    const conflict = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ errors: [], message: "conflict detail", success: false }), {
          headers: { "Content-Type": "application/json" },
          status: 409,
        }),
      ),
    );
    await expect(
      createApiEventProgramsAdapter({ environment, fetcher: conflict }, () => "token")
        .archiveEventProgram!("program-1"),
    ).rejects.toMatchObject({ status: 409 });
  });
});
