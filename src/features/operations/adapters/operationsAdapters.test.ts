import { describe, expect, it } from "vitest";

import { mockOperationsReadModel } from "@/data/mock";

import { createMockOperationsAdapter } from "./mockOperationsAdapter";
import {
  createUnavailableOperationsAdapter,
  OPERATIONS_CONTRACT_PENDING_MESSAGE,
} from "./unavailableOperationsAdapter";

describe("createMockOperationsAdapter", () => {
  it("should resolve the mock operational read model", async () => {
    const operations = await createMockOperationsAdapter().loadOperations();

    expect(operations).toBe(mockOperationsReadModel);
    expect(operations.attendanceRecords.length).toBeGreaterThan(0);
  });
});

describe("createUnavailableOperationsAdapter", () => {
  it("should explain that the backend contract is still pending", async () => {
    await expect(createUnavailableOperationsAdapter().loadOperations()).rejects.toThrow(
      OPERATIONS_CONTRACT_PENDING_MESSAGE,
    );
  });
});
