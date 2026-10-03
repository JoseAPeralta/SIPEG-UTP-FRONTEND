import { describe, expect, it } from "vitest";

import { mapOrganizationalUnit, mapOrganizationalUnitsPage } from "./organizationalUnitsMapper";

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
});
