// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { ActivityAdministrationMappingError } from "./administrativeActivityMapper";
import { toActivityMutationFailure } from "./activityFailure";
import { createApiActivitiesAdapter } from "./apiActivitiesAdapter";

const environment = { DEV: false, PROD: true, VITE_API_BASE_URL: "https://api.test" };

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  return input instanceof URL ? input.href : input.url;
}

function listItem(overrides: Record<string, unknown> = {}) {
  return {
    bannerUrl: null,
    capacity: 40,
    classroom: null,
    date: "2026-08-24",
    description: null,
    endTime: "11:00",
    eventProgram: { id: "program-1", label: null, name: "Programa" },
    id: "activity-1",
    name: "Taller",
    organizationalUnit: { id: "fic", name: "Facultad", type: "FACULTY" },
    speakers: [],
    startTime: "09:00",
    status: "DRAFT",
    type: "WORKSHOP",
    ...overrides,
  };
}

function detail(overrides: Record<string, unknown> = {}) {
  return {
    ...listItem(),
    cancelReason: null,
    checkedInCount: 2,
    enrolledCount: 10,
    equipment: ["Proyector"],
    ...overrides,
  };
}

function envelope(data: unknown) {
  return JSON.stringify({ success: true, message: "ok", data });
}

function jsonResponse(body: string, status = 200): Response {
  return new Response(body, {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

describe("createApiActivitiesAdapter", () => {
  it("requests one filtered page with the administrative credential", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        envelope({
          items: [listItem()],
          limit: 20,
          page: 2,
          total: 21,
          totalPages: 2,
        }),
      ),
    );
    const adapter = createApiActivitiesAdapter({ environment, fetcher }, () => "admin-token");

    const result = await adapter.loadProgramActivitiesPage(
      "program / 1",
      {
        dateFrom: "2026-08-01",
        dateTo: "2026-08-31",
        q: "taller",
        status: "ALL",
        type: "WORKSHOP",
      },
      2,
    );

    const [input, init] = fetcher.mock.calls[0]!;
    const url = new URL(requestUrl(input));
    expect(url.pathname).toBe("/api/v1/event-programs/program%20%2F%201/activities");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      dateFrom: "2026-08-01",
      dateTo: "2026-08-31",
      limit: "20",
      page: "2",
      q: "taller",
      status: "ALL",
      type: "WORKSHOP",
    });
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer admin-token");
    expect(result).toMatchObject({ limit: 20, page: 2, total: 21, totalPages: 2 });
    expect(result.items[0]).toMatchObject({ id: "activity-1", status: "DRAFT" });
  });

  it("omits absent filters and reads the current token on each call", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse(envelope({ items: [], limit: 20, page: 1, total: 0, totalPages: 1 })),
      )
      .mockResolvedValueOnce(jsonResponse(envelope(detail())));
    const readToken = vi
      .fn()
      .mockReturnValueOnce("first-token")
      .mockReturnValueOnce("rotated-token");
    const adapter = createApiActivitiesAdapter({ environment, fetcher }, readToken);

    await adapter.loadProgramActivitiesPage("program-1", {}, 1);
    await adapter.getActivity("activity-1");

    const [firstInput] = fetcher.mock.calls[0]!;
    expect(new URL(requestUrl(firstInput)).searchParams.toString()).toBe("limit=20&page=1");
    expect(
      fetcher.mock.calls.map(([, init]) => new Headers(init?.headers).get("Authorization")),
    ).toEqual(["Bearer first-token", "Bearer rotated-token"]);
  });

  it("maps the full detail, including equipment and counters", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        jsonResponse(envelope(detail({ status: "CANCELLED", cancelReason: "Lluvia" }))),
      );
    const adapter = createApiActivitiesAdapter({ environment, fetcher }, () => "token");

    const result = await adapter.getActivity("activity-1");

    expect(result).toMatchObject({
      cancelReason: "Lluvia",
      checkedInCount: 2,
      enrolledCount: 10,
      equipment: ["Proyector"],
      status: "CANCELLED",
    });
  });

  it("reads the program page without detail fields and the detail under demand", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse(
          envelope({ items: [listItem()], limit: 20, page: 1, total: 1, totalPages: 1 }),
        ),
      )
      .mockResolvedValueOnce(jsonResponse(envelope(detail())));
    const adapter = createApiActivitiesAdapter({ environment, fetcher }, () => "token");

    const page = await adapter.loadProgramActivitiesPage("program-1", {}, 1);

    for (const field of ["cancelReason", "checkedInCount", "enrolledCount", "equipment"]) {
      expect(page.items[0]).not.toHaveProperty(field);
    }

    const activity = await adapter.getActivity("activity-1");

    expect(activity).toMatchObject({ enrolledCount: 10, equipment: ["Proyector"] });
    expect(new URL(requestUrl(fetcher.mock.calls[0]![0])).pathname).toBe(
      "/api/v1/event-programs/program-1/activities",
    );
    expect(new URL(requestUrl(fetcher.mock.calls[1]![0])).pathname).toBe(
      "/api/v1/activities/activity-1",
    );
  });

  it("rejects a detail payload that drifts from the contract", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(envelope({ ...detail(), equipment: undefined })));
    const adapter = createApiActivitiesAdapter({ environment, fetcher }, () => "token");

    await expect(adapter.getActivity("activity-1")).rejects.toBeInstanceOf(
      ActivityAdministrationMappingError,
    );
  });

  it("creates with an allowlisted body that keeps eventProgramId", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(envelope(detail()), 201));
    const adapter = createApiActivitiesAdapter({ environment, fetcher }, () => "token");

    await adapter.createActivity({
      classroomId: "classroom-1",
      date: "2026-08-24",
      description: null,
      endTime: "11:00",
      eventProgramId: "program-1",
      maxCapacity: 40,
      name: "Taller",
      speakers: [{ email: null, firstName: "Ana", lastName: "Perez", organization: null }],
      startTime: "09:00",
      type: "WORKSHOP",
    });

    const [, init] = fetcher.mock.calls[0]!;
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({
      classroomId: "classroom-1",
      date: "2026-08-24",
      description: null,
      endTime: "11:00",
      eventProgramId: "program-1",
      maxCapacity: 40,
      name: "Taller",
      speakers: [{ email: null, firstName: "Ana", lastName: "Perez", organization: null }],
      startTime: "09:00",
      type: "WORKSHOP",
    });
  });

  it("drops an injected notification intention when creating", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(envelope(detail()), 201));
    const adapter = createApiActivitiesAdapter({ environment, fetcher }, () => "token");

    await adapter.createActivity({
      date: "2026-08-24",
      endTime: "11:00",
      eventProgramId: "program-1",
      name: "Taller",
      notifyAttendees: true,
      startTime: "09:00",
      type: "WORKSHOP",
    } as never);

    const [, init] = fetcher.mock.calls[0]!;
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({
      date: "2026-08-24",
      endTime: "11:00",
      eventProgramId: "program-1",
      name: "Taller",
      startTime: "09:00",
      type: "WORKSHOP",
    });
  });

  it("patches only the provided fields and never the program", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(envelope(detail())));
    const adapter = createApiActivitiesAdapter({ environment, fetcher }, () => "token");

    await adapter.updateActivity("activity-1", { description: "Otra", maxCapacity: null });

    const [input, init] = fetcher.mock.calls[0]!;
    expect(new URL(requestUrl(input)).pathname).toBe("/api/v1/activities/activity-1");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(init?.body as string)).toEqual({ description: "Otra", maxCapacity: null });
  });

  it("publishes and unpublishes exclusively with the state change", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(envelope(detail({ status: "SCHEDULED" }))))
      .mockResolvedValueOnce(jsonResponse(envelope(detail({ status: "DRAFT" }))));
    const adapter = createApiActivitiesAdapter({ environment, fetcher }, () => "token");

    await adapter.updateActivity("activity-1", { status: "SCHEDULED" });
    await adapter.updateActivity("activity-1", { status: "DRAFT" });

    expect(
      fetcher.mock.calls.map(([, init]) => JSON.parse(init?.body as string) as unknown),
    ).toEqual([{ status: "SCHEDULED" }, { status: "DRAFT" }]);
  });

  it("drops injected update properties outside the contract", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(envelope(detail())));
    const adapter = createApiActivitiesAdapter({ environment, fetcher }, () => "token");

    await adapter.updateActivity("activity-1", {
      description: "Otra",
      injected: "valor ajeno",
      status: "SCHEDULED",
    } as never);

    const [, init] = fetcher.mock.calls[0]!;
    expect(JSON.parse(init?.body as string)).toEqual({ description: "Otra", status: "SCHEDULED" });
  });

  it.each([true, false])(
    "omits an unsupported update notification intention of %s",
    async (notifyAttendees) => {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(envelope(detail())));
      const adapter = createApiActivitiesAdapter({ environment, fetcher }, () => "token");

      await adapter.updateActivity("activity-1", {
        description: "Descripción actualizada",
        notifyAttendees,
      } as never);

      const [, init] = fetcher.mock.calls[0]!;
      expect(init?.method).toBe("PATCH");
      expect(JSON.parse(init?.body as string)).toEqual({ description: "Descripción actualizada" });
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );

  it("cancels with POST, the encoded id and the current bearer", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse(envelope(detail({ cancelReason: "Lluvia", status: "CANCELLED" }))),
      )
      .mockResolvedValueOnce(jsonResponse(envelope(detail({ cancelReason: "Exceso" }))));
    const readToken = vi
      .fn()
      .mockReturnValueOnce("first-token")
      .mockReturnValueOnce("rotated-token");
    const adapter = createApiActivitiesAdapter({ environment, fetcher }, readToken);

    const result = await adapter.cancelActivity("activity / 1", {});

    const [input, init] = fetcher.mock.calls[0]!;
    expect(new URL(requestUrl(input)).pathname).toBe(
      "/api/v1/activities/activity%20%2F%201/cancel",
    );
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer first-token");
    expect(JSON.parse(init?.body as string)).toEqual({});
    expect(result).toMatchObject({
      cancelReason: "Lluvia",
      checkedInCount: 2,
      enrolledCount: 10,
      status: "CANCELLED",
    });

    await adapter.cancelActivity("activity-1", { reason: "Exceso de aforo" });
    expect(new Headers(fetcher.mock.calls[1]![1]?.headers).get("Authorization")).toBe(
      "Bearer rotated-token",
    );
  });

  it("sends only the reason and drops injected cancel properties", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(envelope(detail())));
    const adapter = createApiActivitiesAdapter({ environment, fetcher }, () => "token");

    await adapter.cancelActivity("activity-1", { injected: "ajeno", reason: "Lluvia" } as never);

    const [, init] = fetcher.mock.calls[0]!;
    expect(JSON.parse(init?.body as string)).toEqual({ reason: "Lluvia" });
  });

  it.each([true, false])(
    "omits an unsupported cancel notification intention of %s",
    async (notifyAttendees) => {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(envelope(detail())));
      const adapter = createApiActivitiesAdapter({ environment, fetcher }, () => "token");

      await adapter.cancelActivity("activity-1", { notifyAttendees, reason: "Lluvia" } as never);

      const [, init] = fetcher.mock.calls[0]!;
      expect(init?.method).toBe("POST");
      expect(JSON.parse(init?.body as string)).toEqual({ reason: "Lluvia" });
    },
  );

  it("rejects a cancel response outside the contract", async () => {
    const invalidEnvelope = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(JSON.stringify({ message: "ok", success: true })));
    const adapter = createApiActivitiesAdapter(
      { environment, fetcher: invalidEnvelope },
      () => "token",
    );

    await expect(adapter.cancelActivity("activity-1", {})).rejects.toBeInstanceOf(
      ActivityAdministrationMappingError,
    );

    const invalidDetail = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(envelope({ ...detail(), checkedInCount: undefined })));
    const detailAdapter = createApiActivitiesAdapter(
      { environment, fetcher: invalidDetail },
      () => "token",
    );

    await expect(detailAdapter.cancelActivity("activity-1", {})).rejects.toBeInstanceOf(
      ActivityAdministrationMappingError,
    );
  });

  it("classifies cancel errors without exposing backend messages", async () => {
    const expected = new Map([
      [400, "invalidRequest"],
      [401, "forbidden"],
      [403, "forbidden"],
      [404, "notFound"],
      [409, "conflict"],
    ]);

    for (const [status, failure] of expected) {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          jsonResponse(
            JSON.stringify({ message: "detalle interno del backend", success: false }),
            status,
          ),
        );
      const adapter = createApiActivitiesAdapter({ environment, fetcher }, () => "token");

      const error = await adapter
        .cancelActivity("activity-1", {})
        .catch((reason: unknown) => reason);

      expect(toActivityMutationFailure(error)).toBe(failure);
      expect((error as Error).message).not.toContain("detalle interno del backend");
    }
  });

  it("deletes without a body and reads the current bearer with the encoded id", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    const readToken = vi
      .fn()
      .mockReturnValueOnce("first-token")
      .mockReturnValueOnce("rotated-token");
    const adapter = createApiActivitiesAdapter({ environment, fetcher }, readToken);

    const result = await adapter.deleteActivity("activity / 1");

    const [input, init] = fetcher.mock.calls[0]!;
    expect(new URL(requestUrl(input)).pathname).toBe("/api/v1/activities/activity%20%2F%201");
    expect(init?.method).toBe("DELETE");
    expect(init?.body).toBeUndefined();
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer first-token");
    expect(result).toBeUndefined();

    await adapter.deleteActivity("activity-1");
    expect(new Headers(fetcher.mock.calls[1]![1]?.headers).get("Authorization")).toBe(
      "Bearer rotated-token",
    );
  });

  it("does not send an authenticated deletion without a token", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    const adapter = createApiActivitiesAdapter({ environment, fetcher }, () => null);

    const error = await adapter.deleteActivity("activity-1").catch((reason: unknown) => reason);

    expect(fetcher).not.toHaveBeenCalled();
    expect((error as { status?: number }).status).toBe(401);
    expect(toActivityMutationFailure(error)).toBe("forbidden");
  });

  it("classifies delete errors preserving their status without parsing JSON", async () => {
    const expected = new Map([
      [400, "invalidRequest"],
      [401, "forbidden"],
      [403, "forbidden"],
      [404, "notFound"],
      [409, "conflict"],
    ]);

    for (const [status, failure] of expected) {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          jsonResponse(
            JSON.stringify({ message: "detalle interno del backend", success: false }),
            status,
          ),
        );
      const adapter = createApiActivitiesAdapter({ environment, fetcher }, () => "token");

      const error = await adapter.deleteActivity("activity-1").catch((reason: unknown) => reason);

      expect((error as { status?: number }).status).toBe(status);
      expect(toActivityMutationFailure(error)).toBe(failure);
      expect((error as Error).message).not.toContain("detalle interno del backend");
    }
  });
});
