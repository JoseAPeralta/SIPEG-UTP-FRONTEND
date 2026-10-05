// @vitest-environment node

import { describe, expect, it } from "vitest";

import { ApiError } from "@/app/adapters/http/apiClient";

import {
  createQueryClient,
  QUERY_GC_TIME_MS,
  QUERY_MAX_RETRIES,
  QUERY_STALE_TIME_MS,
  shouldRetryQuery,
} from "./queryClient";

describe("shouldRetryQuery", () => {
  it("should not retry client errors", () => {
    expect(shouldRetryQuery(0, new ApiError("No encontrado", 404))).toBe(false);
    expect(shouldRetryQuery(0, new ApiError("No autorizado", 401))).toBe(false);
    expect(shouldRetryQuery(0, new ApiError("Sin permisos", 403))).toBe(false);
  });

  it("should retry server and connection errors up to the limit", () => {
    expect(shouldRetryQuery(0, new ApiError("Servidor caido", 500))).toBe(true);
    expect(shouldRetryQuery(0, new ApiError("Sin conexion", 0))).toBe(true);
    expect(shouldRetryQuery(QUERY_MAX_RETRIES, new ApiError("Servidor caido", 500))).toBe(false);
  });

  it("should retry unknown errors only up to the limit", () => {
    expect(shouldRetryQuery(0, new Error("boom"))).toBe(true);
    expect(shouldRetryQuery(QUERY_MAX_RETRIES, new Error("boom"))).toBe(false);
  });
});

describe("createQueryClient", () => {
  it("should apply the shared query defaults", () => {
    const defaults = createQueryClient().getDefaultOptions().queries;

    expect(defaults?.staleTime).toBe(QUERY_STALE_TIME_MS);
    expect(defaults?.gcTime).toBe(QUERY_GC_TIME_MS);
    expect(defaults?.retry).toBe(shouldRetryQuery);
    expect(defaults?.refetchOnWindowFocus).toBe(true);
  });

  it("should allow test or feature overrides", () => {
    const defaults = createQueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    }).getDefaultOptions().queries;

    expect(defaults?.retry).toBe(false);
    expect(defaults?.staleTime).toBe(0);
    expect(defaults?.gcTime).toBe(QUERY_GC_TIME_MS);
  });
});
