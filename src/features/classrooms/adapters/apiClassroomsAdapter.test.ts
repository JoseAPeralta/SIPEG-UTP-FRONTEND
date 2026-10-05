import { describe, expect, it, vi } from "vitest";

import type { Classroom } from "@/types/domain";
import type { ClassroomDetail } from "../model/classroomDetail";

import { createApiClassroomsAdapter } from "./apiClassroomsAdapter";

const environment = { DEV: false, PROD: true, VITE_API_BASE_URL: "https://api.test" };
const classroom = {
  amenities: ["projector"],
  building: "Aulas",
  capacity: 40,
  floor: 1,
  id: "classroom-1",
  isActive: true,
  name: "Aula 101",
  type: "CLASSROOM",
} satisfies Classroom;
const detail: ClassroomDetail = { ...classroom, availability: [] };

function pageResponse(items: unknown[], totalPages = 1, page = 1) {
  return new Response(
    JSON.stringify({
      data: { items, limit: 50, page, total: items.length, totalPages },
      message: "ok",
      success: true,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}

function detailResponse(data: unknown = detail) {
  return new Response(JSON.stringify({ data, message: "ok", success: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

function availabilityResponse(data: unknown = [classroom]) {
  return new Response(JSON.stringify({ data, message: "ok", success: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

function toUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  return input instanceof URL ? input.href : input.url;
}

function bodyOf(requestInit: RequestInit | undefined): Record<string, unknown> {
  const body = requestInit?.body;

  if (typeof body !== "string") throw new Error("the command did not send a JSON body");

  return JSON.parse(body) as Record<string, unknown>;
}

describe("createApiClassroomsAdapter", () => {
  it("should load every page anonymously", async () => {
    const fetcher = vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
      void requestInit;
      return Promise.resolve(
        toUrl(input).includes("page=2")
          ? pageResponse([{ ...classroom, id: "classroom-2" }], 2, 2)
          : pageResponse([classroom], 2, 1),
      );
    });

    const result = await createApiClassroomsAdapter({ environment, fetcher }).loadClassrooms();

    expect(result.map((candidate) => candidate.id)).toEqual(["classroom-1", "classroom-2"]);
    for (const [, requestInit] of fetcher.mock.calls) {
      expect(new Headers(requestInit?.headers).get("Authorization")).toBeNull();
    }
  });

  it("should forward the contract filters as query parameters", async () => {
    const fetcher = vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
      void input;
      void requestInit;
      return Promise.resolve(pageResponse([classroom]));
    });

    await createApiClassroomsAdapter({ environment, fetcher }).loadClassrooms({
      amenity: "proyector",
      isActive: "inactive",
      minCapacity: 30,
      type: "LABORATORY",
    });

    const [input] = fetcher.mock.calls[0] ?? [];
    const search = new URL(toUrl(input ?? "")).searchParams;
    expect(search.get("type")).toBe("LABORATORY");
    expect(search.get("minCapacity")).toBe("30");
    expect(search.get("amenity")).toBe("proyector");
    expect(search.get("isActive")).toBe("false");
    expect(search.get("limit")).toBe("50");
  });

  it("should walk the active and inactive listings when the status filter is all", async () => {
    const fetcher = vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
      void requestInit;
      return Promise.resolve(
        new URL(toUrl(input)).searchParams.get("isActive") === "false"
          ? pageResponse([{ ...classroom, id: "classroom-inactive", isActive: false }])
          : pageResponse([classroom]),
      );
    });

    const result = await createApiClassroomsAdapter({ environment, fetcher }).loadClassrooms({
      isActive: "all",
    });

    expect(result.map((candidate) => candidate.id)).toEqual(["classroom-1", "classroom-inactive"]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("should read the classroom detail anonymously", async () => {
    const fetcher = vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
      void input;
      void requestInit;
      return Promise.resolve(detailResponse());
    });

    const result = await createApiClassroomsAdapter({ environment, fetcher }).getClassroom!(
      "aula 10",
    );

    expect(result).toEqual(detail);
    const [input, requestInit] = fetcher.mock.calls[0] ?? [];
    expect(toUrl(input ?? "")).toContain("/api/v1/classrooms/aula%2010");
    expect(new Headers(requestInit?.headers).get("Authorization")).toBeNull();
  });

  it("should query available classrooms anonymously without listing pagination", async () => {
    const fetcher = vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
      void input;
      void requestInit;
      return Promise.resolve(availabilityResponse());
    });

    const result = await createApiClassroomsAdapter({ environment, fetcher })
      .loadAvailableClassrooms!({
      amenity: "projector",
      date: "2026-08-24",
      endTime: "11:00",
      minCapacity: 40,
      startTime: "09:00",
      type: "LABORATORY",
    });

    expect(result).toEqual([classroom]);
    const [input, requestInit] = fetcher.mock.calls[0] ?? [];
    const search = new URL(toUrl(input ?? "")).searchParams;
    expect(toUrl(input ?? "")).toContain("/api/v1/classrooms/available");
    expect(search.get("date")).toBe("2026-08-24");
    expect(search.get("startTime")).toBe("09:00");
    expect(search.get("endTime")).toBe("11:00");
    expect(search.get("minCapacity")).toBe("40");
    expect(search.get("type")).toBe("LABORATORY");
    expect(search.get("amenity")).toBe("projector");
    expect(search.has("page")).toBe(false);
    expect(search.has("limit")).toBe(false);
    expect(new Headers(requestInit?.headers).get("Authorization")).toBeNull();
  });

  it("should send only the allowed creation fields with the bearer credential", async () => {
    const fetcher = vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
      void input;
      void requestInit;
      return Promise.resolve(detailResponse());
    });

    await createApiClassroomsAdapter({ environment, fetcher }, () => "secret-token")
      .createClassroom!({
      building: "Aulas",
      capacity: 40,
      floor: 1,
      name: "Aula 101",
      type: "CLASSROOM",
    });

    const [input, requestInit] = fetcher.mock.calls[0] ?? [];
    expect(requestInit?.method).toBe("POST");
    expect(toUrl(input ?? "")).toContain("/api/v1/classrooms");
    expect(new Headers(requestInit?.headers).get("Authorization")).toBe("Bearer secret-token");
    expect(bodyOf(requestInit)).toEqual({
      building: "Aulas",
      capacity: 40,
      floor: 1,
      name: "Aula 101",
      type: "CLASSROOM",
    });
  });

  it("should forward only the fields present in a partial update", async () => {
    const fetcher = vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
      void input;
      void requestInit;
      return Promise.resolve(detailResponse());
    });

    await createApiClassroomsAdapter({ environment, fetcher }, () => "secret-token")
      .updateClassroom!("classroom-1", { isActive: false });

    const [, requestInit] = fetcher.mock.calls[0] ?? [];
    expect(requestInit?.method).toBe("PATCH");
    expect(bodyOf(requestInit)).toEqual({ isActive: false });
  });

  it("should encode the amenity in the path and its name in the body", async () => {
    const fetcher = vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
      void input;
      void requestInit;
      return Promise.resolve(detailResponse());
    });

    await createApiClassroomsAdapter({ environment, fetcher }, () => "secret-token")
      .addClassroomAmenity!("classroom-1", "mesa-reglable");

    const [input, requestInit] = fetcher.mock.calls[0] ?? [];
    expect(toUrl(input ?? "")).toContain("/api/v1/classrooms/classroom-1/amenities");
    expect(bodyOf(requestInit)).toEqual({ amenity: "mesa-reglable" });

    await createApiClassroomsAdapter({ environment, fetcher }, () => "secret-token")
      .removeClassroomAmenity!("classroom-1", "proyector/");

    expect(toUrl(fetcher.mock.calls[1]?.[0] ?? "")).toContain("/amenities/proyector%2F");
    expect(fetcher.mock.calls[1]?.[1]?.method).toBe("DELETE");
  });

  it("should add and remove a weekly availability window", async () => {
    const fetcher = vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
      void input;
      void requestInit;
      return Promise.resolve(detailResponse());
    });

    const adapter = createApiClassroomsAdapter({ environment, fetcher }, () => "secret-token");

    await adapter.addClassroomAvailability!("classroom-1", {
      dayOfWeek: 3,
      endTime: "10:00",
      period: null,
      startTime: "08:00",
    });

    expect(toUrl(fetcher.mock.calls[0]?.[0] ?? "")).toContain("/availability");
    expect(bodyOf(fetcher.mock.calls[0]?.[1])).toEqual({
      dayOfWeek: 3,
      endTime: "10:00",
      period: null,
      startTime: "08:00",
    });

    await adapter.removeClassroomAvailability!("classroom-1", "availability-1");

    expect(toUrl(fetcher.mock.calls[1]?.[0] ?? "")).toContain("/availability/availability-1");
    expect(fetcher.mock.calls[1]?.[1]?.method).toBe("DELETE");
  });
});
