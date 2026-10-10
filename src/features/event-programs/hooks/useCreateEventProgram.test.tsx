import { act, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters } from "@/app/adapters";
import { createQueryClient, queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createAuthTokens, createEventProgram } from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";
import type { EventProgram } from "@/types/domain";

import type { CreateEventProgramRequest } from "../model/eventProgramRequests";
import { useCreateEventProgram } from "./useCreateEventProgram";

const request: CreateEventProgramRequest = {
  description: null,
  endDate: "2026-06-19",
  label: null,
  name: "Programa nuevo",
  organizationalUnitId: "fisc",
  startDate: "2026-06-15",
};

function signIn(globalRole: "ADMIN" | "USER" = "ADMIN", id = "admin-1") {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole, id }),
    tokens: createAuthTokens(),
  });
}

function renderCreation(configure?: (adapters: ReturnType<typeof createAppAdapters>) => void) {
  const adapters = createAppAdapters({ source: "mock" });
  configure?.(adapters);
  const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

  return {
    invalidateQueries,
    ...renderHookWithProviders(() => useCreateEventProgram(), { adapters, queryClient }),
  };
}

afterEach(() => useSessionStore.setState({ currentUser: null, tokens: null }));

describe("useCreateEventProgram", () => {
  it("creates through the port and invalidates every administrative page by prefix", async () => {
    signIn();
    const create = vi.fn().mockResolvedValue(createEventProgram());
    const { invalidateQueries, result } = renderCreation((adapters) => {
      adapters.eventPrograms = { ...adapters.eventPrograms, createEventProgram: create };
    });

    await act(async () => {
      await result.current.create(request);
    });

    expect(create).toHaveBeenCalledWith(request);
    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: queryKeys.administrativeEventPrograms("admin-1"),
      }),
    );
  });

  it("exposes a typed failure for a rejected creation", async () => {
    signIn();
    const { result } = renderCreation((adapters) => {
      adapters.eventPrograms = {
        ...adapters.eventPrograms,
        createEventProgram: vi
          .fn()
          .mockRejectedValue(Object.assign(new Error("backend detail"), { status: 400 })),
      };
    });

    await act(async () => {
      await expect(result.current.create(request)).rejects.toBeTruthy();
    });

    await waitFor(() => expect(result.current.failure).toBe("invalidRequest"));
  });

  it("does not execute or invalidate without an administrator identity", async () => {
    signIn("USER");
    const create = vi.fn();
    const { invalidateQueries, result } = renderCreation((adapters) => {
      adapters.eventPrograms = { ...adapters.eventPrograms, createEventProgram: create };
    });

    await act(async () => {
      await expect(result.current.create(request)).rejects.toThrow(/no está disponible/i);
    });

    expect(create).not.toHaveBeenCalled();
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it("scopes the invalidation to the current identity", async () => {
    signIn("ADMIN", "admin-2");
    const { invalidateQueries, result } = renderCreation((adapters) => {
      adapters.eventPrograms = {
        ...adapters.eventPrograms,
        createEventProgram: vi.fn().mockResolvedValue(createEventProgram()),
      };
    });

    await act(async () => {
      await result.current.create(request);
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

  it("clears the previous failure on reset", async () => {
    signIn();
    const { result } = renderCreation((adapters) => {
      adapters.eventPrograms = {
        ...adapters.eventPrograms,
        createEventProgram: vi
          .fn()
          .mockRejectedValue(Object.assign(new Error("backend detail"), { status: 403 })),
      };
    });

    await act(async () => {
      await expect(result.current.create(request)).rejects.toBeTruthy();
    });
    await waitFor(() => expect(result.current.failure).toBe("forbidden"));

    act(() => result.current.reset());

    await waitFor(() => expect(result.current.failure).toBeNull());
  });

  it("tracks the pending state while the request is in flight", async () => {
    signIn();
    let resolveCreate: (program: EventProgram) => void = () => undefined;
    const create = vi.fn(
      () =>
        new Promise<EventProgram>((resolve) => {
          resolveCreate = resolve;
        }),
    );
    const { result } = renderCreation((adapters) => {
      adapters.eventPrograms = { ...adapters.eventPrograms, createEventProgram: create };
    });

    let pending: Promise<EventProgram> = Promise.resolve(createEventProgram());
    act(() => {
      pending = result.current.create(request);
    });

    await waitFor(() => expect(result.current.isPending).toBe(true));

    await act(async () => {
      resolveCreate(createEventProgram());
      await pending;
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
  });
});
