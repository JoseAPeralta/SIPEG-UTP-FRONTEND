import { describe, expect, it } from "vitest";

import { createMockClassroomsAdapter } from "./mockClassroomsAdapter";

describe("createMockClassroomsAdapter", () => {
  it("should return independent copies", async () => {
    const adapter = createMockClassroomsAdapter();
    const first = await adapter.loadClassrooms();
    const second = await adapter.loadClassrooms();
    const originalName = second[0]?.name;

    if (first[0]) first[0].name = "Mutada";

    expect(second[0]?.name).toBe(originalName);
  });
});
