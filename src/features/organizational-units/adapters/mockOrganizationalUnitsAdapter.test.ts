// @vitest-environment node

import { describe, expect, it } from "vitest";

import { createMockOrganizationalUnitsAdapter } from "./mockOrganizationalUnitsAdapter";

describe("createMockOrganizationalUnitsAdapter", () => {
  it("should return independent copies", async () => {
    const adapter = createMockOrganizationalUnitsAdapter();
    const first = await adapter.loadOrganizationalUnits();
    const second = await adapter.loadOrganizationalUnits();
    const originalName = second[0]?.name;

    if (first[0]) first[0].name = "Mutada";

    expect(first).not.toBe(second);
    expect(second[0]?.name).toBe(originalName);
  });

  it("should filter inactive units and keep the whole collection otherwise", async () => {
    const adapter = createMockOrganizationalUnitsAdapter();
    await adapter.deactivateOrganizationalUnit!("fic");

    const all = await adapter.loadOrganizationalUnits({ isActive: "all" });
    expect(all.map((unit) => unit.id)).toContain("fic");

    const inactive = await adapter.loadOrganizationalUnits({ isActive: "inactive" });
    expect(inactive.map((unit) => unit.id)).toEqual(["fic"]);
    expect(inactive.every((unit) => !unit.isActive)).toBe(true);

    const withoutFilters = await adapter.loadOrganizationalUnits();
    expect(withoutFilters.map((unit) => unit.id)).toEqual(all.map((unit) => unit.id));
  });

  it("should reject a duplicate code case-insensitively", async () => {
    const adapter = createMockOrganizationalUnitsAdapter();

    await expect(
      adapter.createOrganizationalUnit!({
        code: "fic",
        description: null,
        name: "Otra facultad",
        type: "FACULTY",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("should reject deactivation while the default program has activities", async () => {
    const adapter = createMockOrganizationalUnitsAdapter();

    await expect(adapter.deactivateOrganizationalUnit!("fisc")).rejects.toMatchObject({
      status: 409,
    });
  });

  it("should deactivate a free unit and archive its default program", async () => {
    const adapter = createMockOrganizationalUnitsAdapter();

    const detail = await adapter.deactivateOrganizationalUnit!("fic");

    expect(detail.isActive).toBe(false);
    expect(detail.defaultProgram?.status).toBe("ARCHIVED");

    const reactivated = await adapter.reactivateOrganizationalUnit!("fic");
    expect(reactivated.isActive).toBe(true);
    expect(reactivated.defaultProgram?.status).toBe("ACTIVE");
  });

  it("should reject an unknown unit with 404", async () => {
    const adapter = createMockOrganizationalUnitsAdapter();

    await expect(adapter.getOrganizationalUnit!("missing")).rejects.toMatchObject({ status: 404 });
  });
});
