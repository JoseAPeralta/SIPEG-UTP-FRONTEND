import { act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import { useWorkingContextStore } from "@/store/workingContext";
import {
  createActivityCatalogPayload,
  createAuthenticatedUser,
  createAuthTokens,
  createClassroom,
  createOrganizationalUnit,
} from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import { useWorkingContext } from "./useWorkingContext";

describe("useWorkingContext", () => {
  beforeEach(() => {
    useWorkingContextStore.getState().clearWorkingContext();
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens(),
    });
  });

  afterEach(() => {
    useSessionStore.getState().clearSession();
  });

  it("should resolve the scope of a selected event program", async () => {
    useWorkingContextStore
      .getState()
      .setWorkingContext({ id: "program-innovation-week", kind: "eventProgram" });

    const { result } = renderHookWithProviders(() => useWorkingContext());

    await waitFor(() => expect(result.current.scope).not.toBeNull());
    expect(result.current.scope?.program.id).toBe("program-innovation-week");
    expect(result.current.scope?.activityIds.length).toBeGreaterThan(0);
  });

  it("should resolve the scope of a selected activity", async () => {
    useWorkingContextStore
      .getState()
      .setWorkingContext({ id: "activity-open-data-governance", kind: "activity" });

    const { result } = renderHookWithProviders(() => useWorkingContext());

    await waitFor(() => expect(result.current.scope).not.toBeNull());
    expect(result.current.scope?.activityIds).toEqual(["activity-open-data-governance"]);
    expect(result.current.scope?.unit.code).toBe("FISC");
  });

  it("should ignore unknown selections", async () => {
    useWorkingContextStore
      .getState()
      .setWorkingContext({ id: "activity-missing", kind: "activity" });

    const { result } = renderHookWithProviders(() => useWorkingContext());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.scope).toBeNull();
  });

  it("should update the store from a serialized value", async () => {
    const { result } = renderHookWithProviders(() => useWorkingContext());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.onValueChange("activity:activity-open-data-governance"));
    expect(useWorkingContextStore.getState().workingContext).toEqual({
      id: "activity-open-data-governance",
      kind: "activity",
    });

    act(() => result.current.onValueChange(""));
    expect(useWorkingContextStore.getState().workingContext).toBeNull();
  });

  it("should resolve an archived program that remains readable", async () => {
    useWorkingContextStore
      .getState()
      .setWorkingContext({ id: "program-robotics-competition-2024", kind: "eventProgram" });

    const { result } = renderHookWithProviders(() => useWorkingContext());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.scope?.program.status).toBe("ARCHIVED");
    expect(result.current.scope?.unit.code).toBe("FIM");
  });

  it("should retire a selection that a complete read confirms as absent", async () => {
    useWorkingContextStore
      .getState()
      .setWorkingContext({ id: "program-missing", kind: "eventProgram" });

    const { result } = renderHookWithProviders(() => useWorkingContext());

    await waitFor(() => expect(useWorkingContextStore.getState().workingContext).toBeNull());
    expect(result.current.selectionRevoked).toBe(true);
  });

  it("should keep the selection while the catalog fails", async () => {
    const adapters = createAppAdapters({ source: "mock" });
    adapters.activityCatalog = {
      ...adapters.activityCatalog,
      loadCatalog: vi.fn().mockRejectedValue(new Error("catalogo caido")),
    };
    useWorkingContextStore
      .getState()
      .setWorkingContext({ id: "program-missing", kind: "eventProgram" });

    const { result } = renderHookWithProviders(() => useWorkingContext(), { adapters });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(useWorkingContextStore.getState().workingContext).toEqual({
      id: "program-missing",
      kind: "eventProgram",
    });
    expect(result.current.selectionRevoked).toBe(false);
  });

  it("should keep the selection while a complete read is still in flight", async () => {
    let resolveCatalog: (value: ReturnType<typeof createActivityCatalogPayload>) => void = () =>
      undefined;
    const pending = new Promise<ReturnType<typeof createActivityCatalogPayload>>((resolve) => {
      resolveCatalog = resolve;
    });
    const adapters = createAppAdapters({ source: "mock" });
    adapters.activityCatalog = {
      ...adapters.activityCatalog,
      loadCatalog: vi.fn().mockReturnValue(pending),
    };
    adapters.organizationalUnits = {
      ...adapters.organizationalUnits,
      loadOrganizationalUnits: vi.fn().mockResolvedValue([createOrganizationalUnit({ id: "fic" })]),
    };
    adapters.classrooms = {
      ...adapters.classrooms,
      loadClassrooms: vi.fn().mockResolvedValue([createClassroom()]),
    };
    useWorkingContextStore
      .getState()
      .setWorkingContext({ id: "program-missing", kind: "eventProgram" });

    const { result } = renderHookWithProviders(() => useWorkingContext(), { adapters });

    await waitFor(() => expect(result.current.isLoading).toBe(true));
    expect(useWorkingContextStore.getState().workingContext).not.toBeNull();

    await act(() => {
      resolveCatalog(createActivityCatalogPayload());
      return Promise.resolve();
    });
    await waitFor(() => expect(useWorkingContextStore.getState().workingContext).toBeNull());
    expect(result.current.selectionRevoked).toBe(true);
  });

  it("should reset the revoked notice with a new selection", async () => {
    useWorkingContextStore
      .getState()
      .setWorkingContext({ id: "program-missing", kind: "eventProgram" });

    const { result } = renderHookWithProviders(() => useWorkingContext());

    await waitFor(() => expect(result.current.selectionRevoked).toBe(true));

    act(() => result.current.onValueChange("eventProgram:program-innovation-week"));
    expect(result.current.selectionRevoked).toBe(false);
    expect(useWorkingContextStore.getState().workingContext).toEqual({
      id: "program-innovation-week",
      kind: "eventProgram",
    });
  });
});
