import { act, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PUBLIC_CATALOG_STALE_TIME_MS } from "@/app/query";
import { createQueryClient } from "@/app/query";
import { renderHookWithProviders } from "@/test/render";

import { getProgramBadgeLabel } from "../model/catalogLabels";

import { usePublicActivities } from "./usePublicActivities";

describe("usePublicActivities", () => {
  it("should order activities from the most recent to the oldest", async () => {
    const { result } = renderHookWithProviders(() => usePublicActivities());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const [first, second] = result.current.pagination.rows;

    expect(result.current.pageSize).toBe(10);
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(first?.activity.date && second?.activity.date).toBeTruthy();
    expect(first!.activity.date >= second!.activity.date).toBe(true);
  });

  it("should filter by organizational unit code and reset the page", async () => {
    const { result } = renderHookWithProviders(() => usePublicActivities());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.onPageChange(2));
    act(() => result.current.onUnitFilterChange("FISC"));

    await waitFor(() => expect(result.current.pagination.currentPage).toBe(1));
    expect(result.current.pagination.rows.every((row) => row.unitCode === "FISC")).toBe(true);
  });

  it("should resolve every unit against the institutional registry", async () => {
    const { result } = renderHookWithProviders(() => usePublicActivities());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.rows.length).toBeGreaterThan(0);
    expect(result.current.rows.every((row) => row.unitCode !== null)).toBe(true);
  });

  it("should label a default program with its unit name instead of the long name", () => {
    expect(
      getProgramBadgeLabel(
        {
          isDefault: true,
          label: null,
          name: "Programa de Eventos - Facultad de Ingenieria Civil",
        },
        { name: "Facultad de Ingenieria Civil" },
      ),
    ).toBe("Facultad de Ingenieria Civil");
  });

  it("should prefer a custom program label over the unit name", () => {
    expect(
      getProgramBadgeLabel(
        { isDefault: false, label: "CIT-2026", name: "Congreso de Innovacion" },
        { name: "Facultad de Ingenieria Civil" },
      ),
    ).toBe("CIT-2026");
  });
});
describe("usePublicActivities caching policy", () => {
  it("should not revalidate the agenda when the window regains focus", async () => {
    const queryClient = createQueryClient();
    const { result } = renderHookWithProviders(() => usePublicActivities(), { queryClient });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.catalog).not.toBeNull();

    // El valor por defecto del cliente revalida al recuperar el foco; la agenda
    // debe desviarse de esa politica para no descargarse en cada cambio de pestana.
    const options = (queryClient.getQueryCache().find({ queryKey: ["public-activity-catalog"] })
      ?.options ?? {}) as { refetchOnWindowFocus?: boolean; staleTime?: number };

    expect(options.refetchOnWindowFocus).toBe(false);
    expect(options.staleTime).toBe(PUBLIC_CATALOG_STALE_TIME_MS);
  });
});
