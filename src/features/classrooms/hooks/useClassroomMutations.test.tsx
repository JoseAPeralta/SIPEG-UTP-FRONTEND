import { act, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters } from "@/app/adapters";
import type { ClassroomsAdapter } from "@/app/adapters/contracts";
import { createQueryClient, queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createAuthTokens, createClassroomDetail } from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import { useClassroomMutations } from "./useClassroomMutations";

function signIn(userId = "admin-1") {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole: "ADMIN", id: userId }),
    tokens: createAuthTokens(),
  });
}

/**
 * The port is injected whole, not merged, so a test can exercise an adapter that genuinely has no
 * commands: merging would keep the mock ones and the "unavailable" path would never run.
 */
function renderMutations(commands: Partial<ClassroomsAdapter> = {}) {
  const adapters = createAppAdapters({ source: "mock" });
  const readOnly: ClassroomsAdapter = { loadClassrooms: adapters.classrooms.loadClassrooms };
  adapters.classrooms = { ...readOnly, ...commands };
  const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

  return {
    invalidateQueries,
    ...renderHookWithProviders(() => useClassroomMutations(), { adapters, queryClient }),
  };
}

afterEach(() => {
  useSessionStore.setState({ currentUser: null, tokens: null });
});

describe("useClassroomMutations", () => {
  it("should refresh lists and availability after creating a classroom", async () => {
    signIn();
    const create = vi.fn().mockResolvedValue(createClassroomDetail());
    const { invalidateQueries, result } = renderMutations({ createClassroom: create });

    await act(async () => {
      await result.current.create({
        building: null,
        capacity: 30,
        floor: null,
        name: "Aula 201",
        type: "CLASSROOM",
      });
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.publicClassrooms });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.administrativeClassroomsScope("admin-1"),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.availableClassroomsRoot,
    });
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: queryKeys.publicActivityCatalog,
    });
  });

  it("should refresh lists, availability, exact details and the agenda when a name changes", async () => {
    signIn();
    const update = vi.fn().mockResolvedValue(createClassroomDetail());
    const { invalidateQueries, result } = renderMutations({ updateClassroom: update });

    await act(async () => {
      await result.current.update("classroom-1", { name: "Aula 102" });
    });

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.publicClassrooms });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.availableClassroomsRoot,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.publicClassroomDetail("classroom-1"),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.administrativeClassroomDetail("admin-1", "classroom-1"),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.publicActivityCatalog,
    });
  });

  it("should keep the agenda untouched when only the state changes", async () => {
    signIn();
    const update = vi.fn().mockResolvedValue(createClassroomDetail());
    const { invalidateQueries, result } = renderMutations({ updateClassroom: update });

    await act(async () => {
      await result.current.update("classroom-1", { isActive: false });
    });

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.availableClassroomsRoot,
    });
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: queryKeys.publicActivityCatalog,
    });
  });

  it("should refresh lists, availability and exact details after an amenity change", async () => {
    signIn();
    const addClassroomAmenity = vi.fn().mockResolvedValue(createClassroomDetail());
    const removeClassroomAmenity = vi.fn().mockResolvedValue(createClassroomDetail());
    const { invalidateQueries, result } = renderMutations({
      addClassroomAmenity,
      removeClassroomAmenity,
    });

    await act(async () => {
      await result.current.addAmenity("classroom-1", "mesa-reglable");
    });
    await act(async () => {
      await result.current.removeAmenity("classroom-1", "proyector");
    });

    expect(addClassroomAmenity).toHaveBeenCalledWith("classroom-1", "mesa-reglable");
    expect(removeClassroomAmenity).toHaveBeenCalledWith("classroom-1", "proyector");
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.publicClassrooms });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.availableClassroomsRoot,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.publicClassroomDetail("classroom-1"),
    });
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: queryKeys.publicActivityCatalog,
    });
  });

  it("should refresh only availability and the exact details after a weekly window change", async () => {
    signIn();
    const addClassroomAvailability = vi.fn().mockResolvedValue(createClassroomDetail());
    const removeClassroomAvailability = vi.fn().mockResolvedValue(createClassroomDetail());
    const { invalidateQueries, result } = renderMutations({
      addClassroomAvailability,
      removeClassroomAvailability,
    });

    await act(async () => {
      await result.current.addAvailability("classroom-1", {
        dayOfWeek: 1,
        endTime: "10:00",
        period: null,
        startTime: "08:00",
      });
    });
    await act(async () => {
      await result.current.removeAvailability("classroom-1", "availability-1");
    });

    expect(addClassroomAvailability).toHaveBeenCalledTimes(1);
    expect(removeClassroomAvailability).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.availableClassroomsRoot,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.administrativeClassroomDetail("admin-1", "classroom-1"),
    });
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: queryKeys.publicClassrooms });
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: queryKeys.publicActivityCatalog,
    });
  });

  it("should expose a localized failure kind instead of the backend error", async () => {
    signIn();
    const updateClassroom = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("aula reservada"), { status: 409 }));
    const { result } = renderMutations({ updateClassroom });

    await act(async () => {
      await result.current.update("classroom-1", { isActive: false }).catch(() => undefined);
    });

    await waitFor(() => expect(result.current.failure).toBe("conflict"));
    expect(result.current.error?.message).toBe("aula reservada");
  });

  it("should report that administration is unavailable when the adapter has no commands", async () => {
    signIn();
    const { result } = renderMutations();

    await act(async () => {
      await result.current
        .create({
          building: null,
          capacity: 30,
          floor: null,
          name: "Aula 201",
          type: "CLASSROOM",
        })
        .catch(() => undefined);
    });

    await waitFor(() => expect(result.current.failure).toBe("unknown"));
    expect(result.current.error?.message).toBe("La administración de aulas no está disponible.");
  });
});
