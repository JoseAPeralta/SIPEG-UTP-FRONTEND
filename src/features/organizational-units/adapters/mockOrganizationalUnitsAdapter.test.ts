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
