import { describe, expect, it } from "vitest";

import { createAppAdapters, resolveDataSource } from "./createAppAdapters";
import { OPERATIONS_CONTRACT_PENDING_MESSAGE } from "@/features/operations/adapters";

describe("resolveDataSource", () => {
  it("should default to the api source", () => {
    expect(resolveDataSource({})).toBe("api");
    expect(resolveDataSource({ VITE_DATA_SOURCE: "unexpected" })).toBe("api");
  });

  it("should select the mock source only when explicitly configured", () => {
    expect(resolveDataSource({ VITE_DATA_SOURCE: "mock" })).toBe("mock");
  });
});

describe("createAppAdapters", () => {
  it("should wire mock adapters when the mock source is explicit", async () => {
    const adapters = createAppAdapters({ source: "mock" });
    const catalog = await adapters.activityCatalog.loadCatalog();

    expect(catalog.activities.length).toBeGreaterThan(0);
    await expect(adapters.operations.loadOperations()).resolves.toBeTruthy();
  });

  it("should keep operations unavailable while the API source lacks contracts", async () => {
    const adapters = createAppAdapters({ source: "api" });

    await expect(adapters.operations.loadOperations()).rejects.toThrow(
      OPERATIONS_CONTRACT_PENDING_MESSAGE,
    );
  });
});
