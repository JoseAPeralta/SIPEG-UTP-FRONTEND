import { act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createAppAdapters } from "@/app/adapters";
import { createQueryClient, queryKeys } from "@/app/query";
import { createClassroom } from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import { useAvailableClassrooms } from "./useAvailableClassrooms";

const criteria = { date: "2026-08-24", endTime: "11:00", startTime: "09:00" };

function renderAvailabilitySearch(
  loadAvailableClassrooms = vi.fn().mockResolvedValue([createClassroom()]),
) {
  const adapters = createAppAdapters({ source: "mock" });
  adapters.classrooms = { ...adapters.classrooms, loadAvailableClassrooms };
  const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });

  return {
    loadAvailableClassrooms,
    ...renderHookWithProviders(() => useAvailableClassrooms(), { adapters, queryClient }),
  };
}

describe("useAvailableClassrooms", () => {
  it("should wait for an explicit valid search before loading classrooms", async () => {
    const { loadAvailableClassrooms, result } = renderAvailabilitySearch();

    expect(loadAvailableClassrooms).not.toHaveBeenCalled();

    act(() => result.current.search(criteria));

    await waitFor(() => expect(loadAvailableClassrooms).toHaveBeenCalledWith(criteria));
    await waitFor(() =>
      expect(result.current.classrooms?.map((classroom) => classroom.id)).toEqual(["classroom-1"]),
    );
    expect(result.current.criteria).toEqual(criteria);
  });

  it("should ignore an invalid request instead of calling the adapter", () => {
    const { loadAvailableClassrooms, result } = renderAvailabilitySearch();

    act(() => result.current.search({ date: "2026-08-24", endTime: "09:00", startTime: "09:00" }));

    expect(loadAvailableClassrooms).not.toHaveBeenCalled();
    expect(result.current.criteria).toBeNull();
  });

  it("should use a separate query identity for each submitted criteria", async () => {
    const { loadAvailableClassrooms, result } = renderAvailabilitySearch();

    act(() => result.current.search(criteria));
    await waitFor(() => expect(loadAvailableClassrooms).toHaveBeenCalledTimes(1));

    const nextCriteria = { ...criteria, minCapacity: 60 };
    act(() => result.current.search(nextCriteria));
    await waitFor(() => expect(loadAvailableClassrooms).toHaveBeenCalledWith(nextCriteria));

    expect(result.current.queryKey).toEqual(queryKeys.availableClassrooms(nextCriteria));
  });
});
