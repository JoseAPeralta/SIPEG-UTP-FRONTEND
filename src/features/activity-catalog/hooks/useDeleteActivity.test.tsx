import { act, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters } from "@/app/adapters";
import { createQueryClient, queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";
import { useWorkingContextStore } from "@/store/workingContext";
import {
  createAdministrativeActivityDetail,
  createAuthenticatedUser,
  createAuthTokens,
} from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import { useDeleteActivity } from "./useDeleteActivity";

const ACTIVITY_ID = "activity-1";
const PROGRAM_ID = "program-1";
const USER_ID = "user-1";
const activityScope = { id: ACTIVITY_ID, type: "activity" } as const;

function setSession(id: string) {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole: "ADMIN", id }),
    tokens: createAuthTokens(),
  });
}

function deferred<T>() {
  let reject!: (reason?: unknown) => void;
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res, rej) => {
    reject = rej;
    resolve = res;
  });

  return { promise, reject, resolve };
}

function createTestQueryClient() {
  return createQueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0 } } });
}

function arrange() {
  setSession(USER_ID);
  const adapters = createAppAdapters({ source: "mock" });
  adapters.activities = {
    ...adapters.activities,
    deleteActivity: vi.fn().mockResolvedValue(undefined),
  };

  return { adapters };
}

function useDeleteActivityFor(onDeleted: () => void) {
  return useDeleteActivity({ activityId: ACTIVITY_ID, onDeleted, programId: PROGRAM_ID });
}

afterEach(() => {
  useSessionStore.getState().clearSession();
  useWorkingContextStore.getState().clearWorkingContext();
});

describe("useDeleteActivity", () => {
  it("should not touch the cache or the context before the delete resolves", async () => {
    const { adapters } = arrange();
    const queryClient = createTestQueryClient();
    const detailKey = queryKeys.activityAdministrationDetail(USER_ID, ACTIVITY_ID);
    const pageKey = queryKeys.activityAdministrationPage(USER_ID, PROGRAM_ID, { status: "ALL" }, 1);
    const original = createAdministrativeActivityDetail({ id: ACTIVITY_ID, name: "Original" });
    queryClient.setQueryData(detailKey, original);
    queryClient.setQueryData(pageKey, { items: [] });
    useWorkingContextStore.getState().setWorkingContext({ id: ACTIVITY_ID, kind: "activity" });
    const gate = deferred<void>();
    adapters.activities.deleteActivity = vi.fn().mockReturnValue(gate.promise);
    const onDeleted = vi.fn();

    const { result } = renderHookWithProviders(() => useDeleteActivityFor(onDeleted), {
      adapters,
      queryClient,
    });

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.remove();
    });
    await waitFor(() =>
      expect(adapters.activities.deleteActivity).toHaveBeenCalledWith(ACTIVITY_ID),
    );

    expect(queryClient.getQueryData(detailKey)).toEqual(original);
    expect(queryClient.getQueryState(pageKey)?.isInvalidated).toBe(false);
    expect(useWorkingContextStore.getState().workingContext).toEqual({
      id: ACTIVITY_ID,
      kind: "activity",
    });
    expect(onDeleted).not.toHaveBeenCalled();

    await act(async () => {
      gate.resolve();
      await pending;
    });
  });

  it("should drop the private reference and invalidate the owning program and related reads", async () => {
    const { adapters } = arrange();
    const queryClient = createTestQueryClient();
    const detailKey = queryKeys.activityAdministrationDetail(USER_ID, ACTIVITY_ID);
    const pageKey = queryKeys.activityAdministrationPage(USER_ID, PROGRAM_ID, { status: "ALL" }, 1);
    const otherProgramPageKey = queryKeys.activityAdministrationPage(
      USER_ID,
      "program-2",
      { status: "ALL" },
      1,
    );
    const catalogKey = queryKeys.administrativeActivityCatalog(USER_ID);
    const scopesKey = queryKeys.userScopesScope(USER_ID);
    const publicCatalogKey = queryKeys.publicActivityCatalog;
    const publicDetailKey = queryKeys.publicActivityDetail(ACTIVITY_ID);
    const availabilityKey = queryKeys.availableClassroomsRoot;
    const permissionsKey = queryKeys.ownPermissions(USER_ID, activityScope);
    const collaboratorsKey = queryKeys.collaborators(USER_ID, activityScope);
    const otherDetailKey = queryKeys.activityAdministrationDetail(USER_ID, "activity-2");
    const otherPermissionsKey = queryKeys.ownPermissions(USER_ID, {
      id: "activity-2",
      type: "activity",
    });
    const programPermissionsKey = queryKeys.ownPermissions(USER_ID, {
      id: PROGRAM_ID,
      type: "program",
    });

    queryClient.setQueryData(detailKey, createAdministrativeActivityDetail({ id: ACTIVITY_ID }));
    queryClient.setQueryData(pageKey, { items: [] });
    queryClient.setQueryData(otherProgramPageKey, { items: [] });
    queryClient.setQueryData(catalogKey, []);
    queryClient.setQueryData(scopesKey, []);
    queryClient.setQueryData(publicCatalogKey, { activities: [] });
    queryClient.setQueryData(publicDetailKey, { id: ACTIVITY_ID });
    queryClient.setQueryData(availabilityKey, []);
    queryClient.setQueryData(permissionsKey, { permissions: [], scope: activityScope });
    queryClient.setQueryData(collaboratorsKey, []);
    queryClient.setQueryData(otherDetailKey, { id: "activity-2" });
    queryClient.setQueryData(otherPermissionsKey, { permissions: [] });
    queryClient.setQueryData(programPermissionsKey, { permissions: [] });
    const onDeleted = vi.fn();

    const { result } = renderHookWithProviders(() => useDeleteActivityFor(onDeleted), {
      adapters,
      queryClient,
    });

    await act(async () => {
      await result.current.remove();
    });

    expect(queryClient.getQueryState(detailKey)).toBeUndefined();
    expect(queryClient.getQueryData(permissionsKey)).toBeUndefined();
    expect(queryClient.getQueryData(collaboratorsKey)).toBeUndefined();
    for (const key of [pageKey, catalogKey, scopesKey, publicCatalogKey, publicDetailKey]) {
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
    }
    expect(queryClient.getQueryState(otherProgramPageKey)?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(availabilityKey)?.isInvalidated).toBe(false);
    expect(queryClient.getQueryData(otherDetailKey)).toEqual({ id: "activity-2" });
    expect(queryClient.getQueryData(otherPermissionsKey)).toEqual({ permissions: [] });
    expect(queryClient.getQueryData(programPermissionsKey)).toEqual({ permissions: [] });
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it("should keep isPending active until the related reads are revalidated", async () => {
    const { adapters } = arrange();
    const queryClient = createTestQueryClient();
    const gate = deferred<void>();
    vi.spyOn(queryClient, "invalidateQueries").mockReturnValue(gate.promise);
    const onDeleted = vi.fn();

    const { result } = renderHookWithProviders(() => useDeleteActivityFor(onDeleted), {
      adapters,
      queryClient,
    });

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.remove();
    });
    await waitFor(() => expect(adapters.activities.deleteActivity).toHaveBeenCalled());
    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(onDeleted).not.toHaveBeenCalled();

    await act(async () => {
      gate.resolve();
      await pending;
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it("should not restore the detail from a read that resolves after deletion", async () => {
    const { adapters } = arrange();
    const queryClient = createTestQueryClient();
    const detailKey = queryKeys.activityAdministrationDetail(USER_ID, ACTIVITY_ID);
    queryClient.setQueryData(
      detailKey,
      createAdministrativeActivityDetail({ id: ACTIVITY_ID, name: "Original" }),
    );
    const late = deferred<ReturnType<typeof createAdministrativeActivityDetail>>();
    adapters.activities.getActivity = vi.fn().mockReturnValue(late.promise);
    const onDeleted = vi.fn();

    const { result } = renderHookWithProviders(() => useDeleteActivityFor(onDeleted), {
      adapters,
      queryClient,
    });

    const reading = queryClient.fetchQuery({
      queryKey: detailKey,
      queryFn: () => adapters.activities.getActivity(ACTIVITY_ID),
      staleTime: 0,
    });

    await act(async () => {
      await result.current.remove();
    });

    await act(async () => {
      late.resolve(createAdministrativeActivityDetail({ id: ACTIVITY_ID, name: "Tardía" }));
      await reading.catch(() => undefined);
    });

    expect(queryClient.getQueryData(detailKey)).toBeUndefined();
  });

  it("should clear only the selection that points to the deleted activity", async () => {
    const { adapters } = arrange();
    const queryClient = createTestQueryClient();
    const onDeleted = vi.fn();

    const { result } = renderHookWithProviders(() => useDeleteActivityFor(onDeleted), {
      adapters,
      queryClient,
    });

    useWorkingContextStore.getState().setWorkingContext({ id: ACTIVITY_ID, kind: "activity" });
    await act(async () => {
      await result.current.remove();
    });
    expect(useWorkingContextStore.getState().workingContext).toBeNull();

    useWorkingContextStore.getState().setWorkingContext({ id: PROGRAM_ID, kind: "eventProgram" });
    await act(async () => {
      await result.current.remove();
    });
    expect(useWorkingContextStore.getState().workingContext).toEqual({
      id: PROGRAM_ID,
      kind: "eventProgram",
    });

    useWorkingContextStore.getState().setWorkingContext({ id: "activity-2", kind: "activity" });
    await act(async () => {
      await result.current.remove();
    });
    expect(useWorkingContextStore.getState().workingContext).toEqual({
      id: "activity-2",
      kind: "activity",
    });
  });

  it("should keep context and data and not announce success when the delete is rejected", async () => {
    const { adapters } = arrange();
    adapters.activities.deleteActivity = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("conflicto"), { status: 409 }));
    const queryClient = createTestQueryClient();
    const detailKey = queryKeys.activityAdministrationDetail(USER_ID, ACTIVITY_ID);
    const pageKey = queryKeys.activityAdministrationPage(USER_ID, PROGRAM_ID, { status: "ALL" }, 1);
    const original = createAdministrativeActivityDetail({ id: ACTIVITY_ID, name: "Original" });
    queryClient.setQueryData(detailKey, original);
    queryClient.setQueryData(pageKey, { items: [] });
    useWorkingContextStore.getState().setWorkingContext({ id: ACTIVITY_ID, kind: "activity" });
    const onDeleted = vi.fn();

    const { result } = renderHookWithProviders(() => useDeleteActivityFor(onDeleted), {
      adapters,
      queryClient,
    });

    await act(async () => {
      await expect(result.current.remove()).rejects.toThrow();
    });

    await waitFor(() => expect(result.current.failure).toBe("conflict"));
    expect(queryClient.getQueryData(detailKey)).toEqual(original);
    expect(queryClient.getQueryState(pageKey)?.isInvalidated).toBe(false);
    expect(useWorkingContextStore.getState().workingContext).toEqual({
      id: ACTIVITY_ID,
      kind: "activity",
    });
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it("should invoke the exit callback only once and never after a rejection", async () => {
    const { adapters } = arrange();
    const queryClient = createTestQueryClient();
    const onDeleted = vi.fn();

    const { result } = renderHookWithProviders(() => useDeleteActivityFor(onDeleted), {
      adapters,
      queryClient,
    });

    await act(async () => {
      await result.current.remove();
    });
    expect(onDeleted).toHaveBeenCalledTimes(1);

    adapters.activities.deleteActivity = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("conflicto"), { status: 409 }));
    await act(async () => {
      await expect(result.current.remove()).rejects.toThrow();
    });
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it("should not navigate nor clear the context when the session changes mid-flight", async () => {
    const { adapters } = arrange();
    const queryClient = createTestQueryClient();
    const gate = deferred<void>();
    adapters.activities.deleteActivity = vi.fn().mockReturnValue(gate.promise);
    useWorkingContextStore.getState().setWorkingContext({ id: ACTIVITY_ID, kind: "activity" });
    const onDeleted = vi.fn();

    const { result } = renderHookWithProviders(() => useDeleteActivityFor(onDeleted), {
      adapters,
      queryClient,
    });

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.remove();
    });
    await waitFor(() => expect(adapters.activities.deleteActivity).toHaveBeenCalled());

    setSession("user-2");
    await act(async () => {
      gate.resolve();
      await pending;
    });

    expect(
      queryClient.getQueryData(queryKeys.activityAdministrationDetail("user-2", ACTIVITY_ID)),
    ).toBeUndefined();
    expect(useWorkingContextStore.getState().workingContext).toEqual({
      id: ACTIVITY_ID,
      kind: "activity",
    });
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it("should not clear the context nor navigate when the session changes during revalidation", async () => {
    const { adapters } = arrange();
    const queryClient = createTestQueryClient();
    const gate = deferred<void>();
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockReturnValue(gate.promise);
    useWorkingContextStore.getState().setWorkingContext({ id: ACTIVITY_ID, kind: "activity" });
    const onDeleted = vi.fn();

    const { result } = renderHookWithProviders(() => useDeleteActivityFor(onDeleted), {
      adapters,
      queryClient,
    });

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.remove();
    });
    await waitFor(() => expect(adapters.activities.deleteActivity).toHaveBeenCalled());
    await waitFor(() => expect(invalidateQueries).toHaveBeenCalled());

    setSession("user-2");
    await act(async () => {
      gate.resolve();
      await pending;
    });

    expect(useWorkingContextStore.getState().workingContext).toEqual({
      id: ACTIVITY_ID,
      kind: "activity",
    });
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
