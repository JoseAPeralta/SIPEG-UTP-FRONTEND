import { describe, expect, it } from "vitest";

import { ApiError } from "@/app/adapters/http/apiClient";

import { toClassroomFailure } from "./classroomFailure";

describe("toClassroomFailure", () => {
  it("should classify every documented status", () => {
    expect(toClassroomFailure(new ApiError("privado", 400))).toBe("invalidRequest");
    expect(toClassroomFailure(new ApiError("privado", 403))).toBe("forbidden");
    expect(toClassroomFailure(new ApiError("privado", 404))).toBe("notFound");
    expect(toClassroomFailure(new ApiError("privado", 409))).toBe("conflict");
  });

  it("should fall back to unknown for network and unexpected failures", () => {
    expect(toClassroomFailure(new ApiError("sin red", 0))).toBe("unknown");
    expect(toClassroomFailure(new Error("sin estado"))).toBe("unknown");
    expect(toClassroomFailure(null)).toBe("unknown");
  });
});
