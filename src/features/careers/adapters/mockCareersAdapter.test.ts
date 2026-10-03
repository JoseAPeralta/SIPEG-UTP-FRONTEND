import { describe, expect, it } from "vitest";

import { createMockCareersAdapter } from "./mockCareersAdapter";

describe("createMockCareersAdapter", () => {
  it("should return independent copies", async () => {
    const adapter = createMockCareersAdapter();
    const first = await adapter.loadCareers();
    const second = await adapter.loadCareers();
    const originalName = second[0]?.name;

    if (first[0]) first[0].name = "Mutada";

    expect(second[0]?.name).toBe(originalName);
  });
});
