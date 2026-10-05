// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  mapOrganizationalUnit,
  mapOrganizationalUnitDetail,
  mapOrganizationalUnitsPage,
} from "./organizationalUnitsMapper";

const unit = {
  code: "FISC",
  description: null,
  head: { firstName: "Mariana", id: "user-1", lastName: "Rodriguez" },
  id: "unit-1",
  isActive: true,
  name: "Facultad de Sistemas",
  type: "FACULTY",
};

describe("organizationalUnitsMapper", () => {
  it("should map a contracted organizational unit", () => {
    expect(mapOrganizationalUnit(unit)).toEqual(unit);
  });

  it("should map and validate a paginated response", () => {
    expect(
      mapOrganizationalUnitsPage({
        data: { items: [unit], limit: 50, page: 1, total: 1, totalPages: 1 },
        message: "ok",
        success: true,
      }),
    ).toEqual({ items: [unit], totalPages: 1 });
  });

  it("should reject values outside the contract", () => {
    expect(() => mapOrganizationalUnit({ ...unit, type: "OFFICE" })).toThrow(/type/);
    expect(() => mapOrganizationalUnit({ ...unit, head: undefined })).toThrow(/head/);
    expect(() =>
      mapOrganizationalUnitsPage({
        data: { items: [unit], totalPages: 1 },
        message: "ok",
        success: true,
      }),
    ).toThrow(/page/);
  });

  it("should map the unit detail returned by lifecycle mutations", () => {
    const detail = {
      ...unit,
      careers: [{ code: "LICS", id: "career-1", name: "Licenciatura en Sistemas" }],
      defaultProgram: { id: "program-1", name: "Agenda permanente", status: "ACTIVE" },
    };

    expect(mapOrganizationalUnitDetail({ data: detail, message: "ok", success: true })).toEqual(
      detail,
    );
  });
});
