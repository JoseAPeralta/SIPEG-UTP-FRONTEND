import { act, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderHookWithProviders } from "@/test/render";

import { usePublicActivities } from "./usePublicActivities";

describe("usePublicActivities", () => {
  it("should order activities from the most recent to the oldest", async () => {
    const { result } = renderHookWithProviders(() => usePublicActivities());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const [first, second] = result.current.pagination.rows;

    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(first?.activity.date && second?.activity.date).toBeTruthy();
    expect(first!.activity.date >= second!.activity.date).toBe(true);
  });

  it("should filter by organizational unit and reset the page", async () => {
    const { result } = renderHookWithProviders(() => usePublicActivities());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.onPageChange(2));
    act(() => result.current.onUnitFilterChange("fisc"));

    await waitFor(() => expect(result.current.pagination.currentPage).toBe(1));
    expect(result.current.pagination.rows.every((row) => row.unit.id === "fisc")).toBe(true);
  });
});
