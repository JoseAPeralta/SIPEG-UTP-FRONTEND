import { act, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters } from "@/app/adapters";
import { createQueryClient, queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";
import {
  createAuthenticatedUser,
  createAuthTokens,
  createEventProgram,
  createEventProgramListItem,
} from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";
import type { EventProgram } from "@/types/domain";

import { useEventProgramMutations } from "./useEventProgramMutations";

const target = createEventProgramListItem({ id: "program-1", organizationalUnitId: "fisc" });

function signIn(globalRole: "ADMIN" | "USER" = "ADMIN", id = "admin-1") {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole, id }),
    tokens: createAuthTokens(),
  });
}

function renderMutations(
  commands: Partial<ReturnType<typeof createAppAdapters>["eventPrograms"]> = {},
) {
  const adapters = createAppAdapters({ source: "mock" });
  adapters.eventPrograms = { ...adapters.eventPrograms, ...commands };
  const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

  return {
    invalidateQueries,
    ...renderHookWithProviders(() => useEventProgramMutations(), { adapters, queryClient }),
  };
}

function resolvedUpdate() {
  return vi.fn().mockResolvedValue(createEventProgram());
}

afterEach(() => useSessionStore.getState().clearSession());

describe("useEventProgramMutations", () => {
  it("should edit through the port and refresh every administrative page by prefix", async () => {
    signIn();
    const updateEventProgram = resolvedUpdate();
    const { invalidateQueries, result } = renderMutations({ updateEventProgram });

    await act(async () => {
      await result.current.update(target, { name: "Programa editado" });
    });

    expect(updateEventProgram).toHaveBeenCalledWith("program-1", { name: "Programa editado" });
    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: queryKeys.administrativeEventPrograms("admin-1"),
      }),
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.administrativeActivityCatalog("admin-1"),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.publicActivityCatalog,
    });
  });

  it("should publish with the only contractual transition", async () => {
    signIn();
    const updateEventProgram = resolvedUpdate();
    const { result } = renderMutations({ updateEventProgram });

    await act(async () => {
      await result.current.publish(target);
    });

    expect(updateEventProgram).toHaveBeenCalledWith("program-1", { status: "ACTIVE" });
  });

  it("should archive and reactivate through their endpoints and refresh the reads", async () => {
    signIn();
    const archiveEventProgram = vi.fn().mockResolvedValue(createEventProgram());
    const reactivateEventProgram = vi.fn().mockResolvedValue(createEventProgram());
    const { invalidateQueries, result } = renderMutations({
      archiveEventProgram,
      reactivateEventProgram,
    });

    await act(async () => {
      await result.current.archive(target);
    });
    await act(async () => {
      await result.current.reactivate(target);
    });

    expect(archiveEventProgram).toHaveBeenCalledWith("program-1");
    expect(reactivateEventProgram).toHaveBeenCalledWith("program-1");
    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: queryKeys.administrativeEventPrograms("admin-1"),
      }),
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.publicActivityCatalog,
    });
  });

  it("should refresh the owning unit of the permanent agenda", async () => {
    signIn();
    const { invalidateQueries, result } = renderMutations({ updateEventProgram: resolvedUpdate() });
    const permanent = createEventProgramListItem({
      id: "program-fic-default",
      isDefault: true,
      organizationalUnit: { id: "fic", name: "Facultad de Ingenieria Civil", type: "FACULTY" },
    });

    await act(async () => {
      await result.current.update(permanent, { name: "Agenda institucional" });
    });

    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: queryKeys.administrativeOrganizationalUnitDetail("admin-1", "fic"),
      }),
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.publicOrganizationalUnitDetail("fic"),
    });
  });

  it("should expose a typed failure without invalidating anything", async () => {
    signIn();
    const { invalidateQueries, result } = renderMutations({
      updateEventProgram: vi
        .fn()
        .mockRejectedValue(Object.assign(new Error("backend detail"), { status: 409 })),
    });

    await act(async () => {
      await expect(result.current.update(target, { name: "Programa" })).rejects.toBeTruthy();
    });

    await waitFor(() => expect(result.current.failure).toBe("conflict"));
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it("should not execute or invalidate without an administrator identity", async () => {
    signIn("USER");
    const updateEventProgram = resolvedUpdate();
    const { invalidateQueries, result } = renderMutations({ updateEventProgram });

    await act(async () => {
      await expect(result.current.update(target, { name: "Programa" })).rejects.toThrow(
        /no está disponible/i,
      );
    });

    expect(updateEventProgram).not.toHaveBeenCalled();
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it("should scope every invalidation to the current identity", async () => {
    signIn("ADMIN", "admin-2");
    const { invalidateQueries, result } = renderMutations({ updateEventProgram: resolvedUpdate() });

    await act(async () => {
      await result.current.update(target, { name: "Programa" });
    });

    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: queryKeys.administrativeEventPrograms("admin-2"),
      }),
    );
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: queryKeys.administrativeEventPrograms("anonymous"),
    });
  });

  it("should clear the previous failure and pending state on reset", async () => {
    signIn();
    let rejectUpdate: (error: unknown) => void = () => undefined;
    const { result } = renderMutations({
      updateEventProgram: vi.fn(
        () =>
          new Promise<EventProgram>((_resolve, reject) => {
            rejectUpdate = reject;
          }),
      ),
    });

    let pending: Promise<EventProgram> = Promise.resolve(createEventProgram());
    act(() => {
      pending = result.current.update(target, { name: "Programa" });
    });
    await waitFor(() => expect(result.current.isPending).toBe(true));

    await act(async () => {
      rejectUpdate(Object.assign(new Error("detail"), { status: 403 }));
      await expect(pending).rejects.toBeTruthy();
    });
    await waitFor(() => expect(result.current.failure).toBe("forbidden"));

    act(() => result.current.reset());

    await waitFor(() => {
      expect(result.current.failure).toBeNull();
      expect(result.current.isPending).toBe(false);
    });
  });
});
