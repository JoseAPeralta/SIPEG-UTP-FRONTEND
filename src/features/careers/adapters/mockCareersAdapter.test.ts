import { describe, expect, it } from "vitest";

import type { ApiError } from "@/app/adapters/http/apiClient";

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

  it("preserves OTROS as the immutable global career", async () => {
    const adapter = createMockCareersAdapter();

    await expect(adapter.updateCareer!("otros", { unitId: "fisc" })).rejects.toMatchObject({
      status: 400,
    } satisfies Partial<ApiError>);
    await expect(adapter.deleteCareer!("otros")).rejects.toMatchObject({ status: 409 });
  });

  it("rejects changing the faculty of a career with associated users", async () => {
    const adapter = createMockCareersAdapter();

    await expect(adapter.updateCareer!("software", { unitId: "fic" })).rejects.toMatchObject({
      status: 409,
    });
  });
});
