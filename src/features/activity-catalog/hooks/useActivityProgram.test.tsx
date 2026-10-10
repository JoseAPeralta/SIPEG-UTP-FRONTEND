import { waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import {
  createAuthenticatedUser,
  createAuthTokens,
  createEventProgram,
  createUserScope,
} from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import type { UserScope } from "@/features/collaboration";
import { useActivityProgram } from "./useActivityProgram";

const PROGRAM_ID = "program-1";
const ACTIVITY_ID = "activity-1";

function setSession(globalRole: "ADMIN" | "USER") {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({
      globalRole,
      id: `${globalRole.toLowerCase()}-1`,
    }),
    tokens: createAuthTokens(),
  });
}

function adaptersWithScopes(scopes: UserScope[]): AppAdapters {
  const adapters = createAppAdapters({ source: "mock" });
  adapters.userScopes = { loadUserScopes: () => Promise.resolve(scopes) };

  return adapters;
}

function programScope(status: UserScope["status"], name = "Semana"): UserScope {
  return createUserScope({
    eventProgram: null,
    id: PROGRAM_ID,
    name,
    status,
    type: "program",
  });
}

describe("useActivityProgram", () => {
  afterEach(() => {
    useSessionStore.getState().clearSession();
  });

  it("should resolve the program from the administrative listing for an administrator", async () => {
    setSession("ADMIN");
    const adapters = createAppAdapters({ source: "mock" });
    adapters.eventPrograms = {
      ...adapters.eventPrograms,
      loadEventPrograms: vi
        .fn()
        .mockResolvedValue([
          createEventProgram({ id: PROGRAM_ID, name: "Semana de Innovacion", status: "DRAFT" }),
        ]),
    };

    const { result } = renderHookWithProviders(
      () => useActivityProgram(PROGRAM_ID, "administration"),
      { adapters },
    );

    await waitFor(() => expect(result.current.status).toBe("DRAFT"));
    expect(result.current.name).toBe("Semana de Innovacion");
    expect(result.current.isArchived).toBe(false);
  });

  it("should resolve an operational program status from the scope status", async () => {
    setSession("USER");
    const adapters = adaptersWithScopes([programScope("DRAFT", "Semana Borrador")]);

    const { result } = renderHookWithProviders(
      () => useActivityProgram(PROGRAM_ID, "operational"),
      { adapters },
    );

    await waitFor(() => expect(result.current.status).toBe("DRAFT"));
    expect(result.current.name).toBe("Semana Borrador");
    expect(result.current.isArchived).toBe(false);
  });

  it("should flag an archived operational program", async () => {
    setSession("USER");
    const adapters = adaptersWithScopes([programScope("ARCHIVED")]);

    const { result } = renderHookWithProviders(
      () => useActivityProgram(PROGRAM_ID, "operational"),
      { adapters },
    );

    await waitFor(() => expect(result.current.status).toBe("ARCHIVED"));
    expect(result.current.isArchived).toBe(true);
  });

  it("should fall back to the exact activity scope program when there is no program scope", async () => {
    setSession("USER");
    const adapters = adaptersWithScopes([
      createUserScope({
        eventProgram: { id: PROGRAM_ID, label: null, name: "Semana Directa", status: "ACTIVE" },
        id: ACTIVITY_ID,
        name: "Actividad directa",
        permissions: [],
        status: "SCHEDULED",
        type: "activity",
      }),
    ]);

    const { result } = renderHookWithProviders(
      () => useActivityProgram("", "operational", ACTIVITY_ID),
      { adapters },
    );

    await waitFor(() => expect(result.current.status).toBe("ACTIVE"));
    expect(result.current.name).toBe("Semana Directa");
  });

  it("should expose an unknown program while discovery is resolving", () => {
    setSession("USER");
    const adapters = createAppAdapters({ source: "mock" });
    adapters.userScopes = { loadUserScopes: () => new Promise<UserScope[]>(() => undefined) };

    const { result } = renderHookWithProviders(
      () => useActivityProgram(PROGRAM_ID, "operational"),
      { adapters },
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.status).toBeNull();
    expect(result.current.name).toBeNull();
  });

  it("should expose an unknown program when discovery fails", async () => {
    setSession("USER");
    const adapters = createAppAdapters({ source: "mock" });
    adapters.userScopes = { loadUserScopes: () => Promise.reject(new Error("sin red")) };

    const { result } = renderHookWithProviders(
      () => useActivityProgram(PROGRAM_ID, "operational"),
      { adapters },
    );

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.status).toBeNull();
    expect(result.current.name).toBeNull();
  });

  it("should expose an unknown program when no scope matches", async () => {
    setSession("USER");
    const adapters = adaptersWithScopes([
      createUserScope({ id: "program-other", status: "ACTIVE", type: "program" }),
    ]);

    const { result } = renderHookWithProviders(
      () => useActivityProgram(PROGRAM_ID, "operational"),
      { adapters },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.status).toBeNull();
    expect(result.current.name).toBeNull();
  });
});
