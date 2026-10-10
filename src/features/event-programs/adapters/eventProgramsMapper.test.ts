// @vitest-environment node

import { describe, expect, it } from "vitest";
import { createEventProgram } from "@/test/factories";
import {
  mapMutatedEventProgram,
  mapEventProgram,
  mapEventProgramsListPage,
  mapEventProgramsPage,
} from "./eventProgramsMapper";

const program = {
  ...createEventProgram(),
  organizationalUnit: { id: "unit-1", name: "Facultad", type: "FACULTY" },
};
const page = {
  success: true,
  message: "ok",
  data: { items: [program], page: 1, limit: 50, total: 1, totalPages: 1 },
};

describe("event programs mapping", () => {
  it("maps the owning unit without exposing the HTTP nesting", () => {
    expect(mapEventProgram(program)).toEqual(
      createEventProgram({ organizationalUnitId: "unit-1" }),
    );
  });

  it("accepts the permanent program with null dates and nullable text", () => {
    expect(
      mapEventProgram({
        ...program,
        isDefault: true,
        startDate: null,
        endDate: null,
        description: "",
      }),
    ).toMatchObject({ isDefault: true, startDate: null, endDate: null, description: "" });
  });

  it.each(["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED", "ARCHIVED"])(
    "accepts contractual status %s",
    (status) => {
      expect(mapEventProgram({ ...program, status }).status).toBe(status);
    },
  );

  it.each([
    { status: "PAUSED" },
    { isDefault: "true" },
    { description: undefined },
    { startDate: undefined },
    { organizationalUnit: { id: "unit-1", type: "FACULTY" } },
    { organizationalUnit: { id: "unit-1", name: "Facultad", type: "OTHER" } },
  ])("rejects incomplete or out-of-contract programs %j", (changes) => {
    expect(() => mapEventProgram({ ...program, ...changes })).toThrow();
  });

  it("validates and maps the paginated envelope", () => {
    expect(mapEventProgramsPage(page)).toEqual({
      items: [mapEventProgram(program)],
      limit: 50,
      page: 1,
      total: 1,
      totalPages: 1,
    });
    expect(
      mapEventProgramsPage({ ...page, data: { ...page.data, items: [], total: 0, totalPages: 0 } })
        .items,
    ).toEqual([]);
  });

  it("keeps the embedded unit in the administrative list page", () => {
    expect(mapEventProgramsListPage(page)).toEqual({
      items: [
        {
          ...mapEventProgram(program),
          organizationalUnit: { id: "unit-1", name: "Facultad", type: "FACULTY" },
        },
      ],
      limit: 50,
      page: 1,
      total: 1,
      totalPages: 1,
    });
  });

  it.each([
    { organizationalUnit: { id: "unit-1", name: "Facultad" } },
    { organizationalUnit: { id: "unit-1", name: "Facultad", type: "OTHER" } },
  ])("rejects a list item without a contractual unit %j", (changes) => {
    const payload = { ...page, data: { ...page.data, items: [{ ...program, ...changes }] } };
    expect(() => mapEventProgramsListPage(payload)).toThrow();
  });

  it.each([
    { ...page, success: false },
    { ...page, message: undefined },
    { ...page, data: { ...page.data, totalPages: 1.5 } },
    { ...page, data: { ...page.data, page: undefined } },
    { ...page, data: { ...page.data, items: null } },
    { ...page, data: { ...page.data, items: [{ ...program, status: "PAUSED" }] } },
  ])("rejects malformed pages %j", (payload) => {
    expect(() => mapEventProgramsPage(payload)).toThrow();
  });

  it("maps the created program inside its success envelope", () => {
    expect(mapMutatedEventProgram({ data: program, message: "created", success: true })).toEqual(
      createEventProgram({ organizationalUnitId: "unit-1" }),
    );
  });

  it.each([
    { data: program, message: "created", success: false },
    { data: program, message: undefined, success: true },
    { data: { ...program, status: "PAUSED" }, message: "created", success: true },
    { data: undefined, message: "created", success: true },
  ])("rejects a malformed creation envelope %j", (payload) => {
    expect(() => mapMutatedEventProgram(payload)).toThrow();
  });
});
