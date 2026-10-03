import { act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createAppAdapters } from "@/app/adapters";
import { createCareer, createOrganizationalUnit } from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import { useRegistrationCatalog } from "./useRegistrationCatalog";

describe("useRegistrationCatalog", () => {
  it("should compose public units and careers", async () => {
    const adapters = createAppAdapters({ source: "mock" });
    const loadCareers = vi.fn().mockResolvedValue([createCareer()]);
    const loadOrganizationalUnits = vi.fn().mockResolvedValue([createOrganizationalUnit()]);
    const { result } = renderHookWithProviders(() => useRegistrationCatalog(), {
      adapters: {
        ...adapters,
        careers: { loadCareers },
        organizationalUnits: { loadOrganizationalUnits },
        registration: { register: vi.fn() },
      },
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.catalog).toEqual({
      careers: [createCareer()],
      organizationalUnits: [createOrganizationalUnit()],
    });
    expect(loadCareers).toHaveBeenCalledTimes(1);
    expect(loadOrganizationalUnits).toHaveBeenCalledTimes(1);
  });

  it("should expose a partial failure and retry both resources", async () => {
    const adapters = createAppAdapters({ source: "mock" });
    const loadCareers = vi
      .fn()
      .mockRejectedValueOnce(new Error("careers unavailable"))
      .mockResolvedValue([createCareer()]);
    const loadOrganizationalUnits = vi.fn().mockResolvedValue([createOrganizationalUnit()]);
    const { result } = renderHookWithProviders(() => useRegistrationCatalog(), {
      adapters: {
        ...adapters,
        careers: { loadCareers },
        organizationalUnits: { loadOrganizationalUnits },
      },
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.catalog).toBeNull();

    await act(async () => result.current.refetch());
    await waitFor(() => expect(result.current.catalog).not.toBeNull());
    expect(loadCareers).toHaveBeenCalledTimes(2);
    expect(loadOrganizationalUnits).toHaveBeenCalledTimes(2);
  });
});
