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
});
