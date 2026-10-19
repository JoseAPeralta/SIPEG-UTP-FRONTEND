import { act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createAppAdapters } from "@/app/adapters";
import { createQueryClient, queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";
import {
  createAdministrativeActivityDetail,
  createAuthenticatedUser,
  createAuthTokens,
} from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import type { CreateActivityRequest } from "../model/activityRequests";
import { useActivityMutations } from "./useActivityMutations";

const PROGRAM_ID = "program-1";
const ACTIVITY_ID = "activity-1";

function createRequest(): CreateActivityRequest {
  return {
    date: "2026-08-24",
    endTime: "11:00",
    eventProgramId: PROGRAM_ID,
    name: "Taller",
    startTime: "09:00",
    type: "WORKSHOP",
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return { promise, resolve };
}

function setSession(id: string) {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole: "ADMIN", id }),
    tokens: createAuthTokens(),
  });
}

function arrange() {
  setSession("admin-1");
  const adapters = createAppAdapters({ source: "mock" });
  adapters.activities = {
    ...adapters.activities,
    cancelActivity: vi.fn().mockResolvedValue(createAdministrativeActivityDetail()),
    createActivity: vi.fn().mockResolvedValue(createAdministrativeActivityDetail()),
    updateActivity: vi.fn().mockResolvedValue(createAdministrativeActivityDetail()),
  };

  return { adapters };
}

function createTestQueryClient() {
  return createQueryClient({ defaultOptions: { queries: { retry: false } } });
}

describe("useActivityMutations", () => {
  it("should invalidate the owning program and every related read, and leave other programs untouched", async () => {
    const { adapters } = arrange();
    const queryClient = createTestQueryClient();
    const pageKey = queryKeys.activityAdministrationPage(
      "admin-1",
      PROGRAM_ID,
      { status: "ALL" },
      1,
    );
    const otherProgramPageKey = queryKeys.activityAdministrationPage(
      "admin-1",
      "program-2",
      { status: "ALL" },
      1,
    );
    const detailKey = queryKeys.activityAdministrationDetail("admin-1", ACTIVITY_ID);
    const otherDetailKey = queryKeys.publicActivityDetail("activity-2");

    queryClient.setQueryData(pageKey, { items: [] });
    queryClient.setQueryData(otherProgramPageKey, { items: [] });
    queryClient.setQueryData(detailKey, { id: ACTIVITY_ID });
    queryClient.setQueryData(queryKeys.administrativeActivityCatalog("admin-1"), []);
    queryClient.setQueryData(queryKeys.publicActivityCatalog, { activities: [] });
    queryClient.setQueryData(queryKeys.publicActivityDetail(ACTIVITY_ID), { id: ACTIVITY_ID });
    queryClient.setQueryData(otherDetailKey, { id: "activity-2" });
    queryClient.setQueryData(queryKeys.availableClassroomsRoot, []);
    queryClient.setQueryData(queryKeys.userScopesScope("admin-1"), []);

    const { result } = renderHookWithProviders(() => useActivityMutations(), {
      adapters,
      queryClient,
    });

    await act(() => result.current.create(createRequest()));

    for (const key of [
      pageKey,
      queryKeys.administrativeActivityCatalog("admin-1"),
      queryKeys.publicActivityCatalog,
      queryKeys.publicActivityDetail(ACTIVITY_ID),
      queryKeys.availableClassroomsRoot,
      queryKeys.userScopesScope("admin-1"),
    ]) {
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
    }
    expect(queryClient.getQueryState(otherProgramPageKey)?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(otherDetailKey)?.isInvalidated).toBe(false);
    expect(queryClient.getQueryData(detailKey)).toEqual(createAdministrativeActivityDetail());
    expect(queryClient.getQueryState(detailKey)?.isInvalidated).toBe(false);
  });

  it("should publish and unpublish through the update operation with status-only bodies", async () => {
    const { adapters } = arrange();
    const { result } = renderHookWithProviders(() => useActivityMutations(), { adapters });

    await act(() => result.current.publish(ACTIVITY_ID));
    expect(adapters.activities.updateActivity).toHaveBeenCalledWith(ACTIVITY_ID, {
      status: "SCHEDULED",
    });

    await act(() => result.current.unpublish(ACTIVITY_ID));
    expect(adapters.activities.updateActivity).toHaveBeenCalledWith(ACTIVITY_ID, {
      status: "DRAFT",
    });
  });

  it("should cancel through the dedicated operation", async () => {
    const { adapters } = arrange();
    const { result } = renderHookWithProviders(() => useActivityMutations(), { adapters });

    await act(() => result.current.cancel(ACTIVITY_ID, { reason: "Motivo" }));

    expect(adapters.activities.cancelActivity).toHaveBeenCalledWith(ACTIVITY_ID, {
      reason: "Motivo",
    });
  });

  it("should store the returned detail in the private detail entry only", async () => {
    const { adapters } = arrange();
    const returned = createAdministrativeActivityDetail({
      id: ACTIVITY_ID,
      name: "Publicada",
      status: "SCHEDULED",
    });
    adapters.activities.updateActivity = vi.fn().mockResolvedValue(returned);
    const queryClient = createTestQueryClient();
    const detailKey = queryKeys.activityAdministrationDetail("admin-1", ACTIVITY_ID);
    queryClient.setQueryData(detailKey, { id: ACTIVITY_ID, name: "Antes" });

    const { result } = renderHookWithProviders(() => useActivityMutations(), {
      adapters,
      queryClient,
    });

    await act(() => result.current.publish(ACTIVITY_ID));

    expect(queryClient.getQueryData(detailKey)).toEqual(returned);
    expect(queryClient.getQueryData(queryKeys.publicActivityCatalog)).toBeUndefined();
  });

  it("should cancel a pending detail read before storing the authoritative response", async () => {
    const { adapters } = arrange();
    const returned = createAdministrativeActivityDetail({ id: ACTIVITY_ID, name: "Publicada" });
    adapters.activities.updateActivity = vi.fn().mockResolvedValue(returned);
    const queryClient = createTestQueryClient();
    const detailKey = queryKeys.activityAdministrationDetail("admin-1", ACTIVITY_ID);
    queryClient.setQueryData(detailKey, { id: ACTIVITY_ID, name: "Antes" });
    const late = deferred<ReturnType<typeof createAdministrativeActivityDetail>>();
    adapters.activities.getActivity = vi.fn().mockReturnValue(late.promise);

    const { result } = renderHookWithProviders(() => useActivityMutations(), {
      adapters,
      queryClient,
    });

    const reading = queryClient
      .fetchQuery({
        queryFn: () => adapters.activities.getActivity(ACTIVITY_ID),
        queryKey: detailKey,
        staleTime: 0,
      })
      .then(
        () => undefined,
        () => undefined,
      );

    await act(() => result.current.publish(ACTIVITY_ID));
    expect(queryClient.getQueryData(detailKey)).toEqual(returned);

    await act(async () => {
      late.resolve(createAdministrativeActivityDetail({ id: ACTIVITY_ID, name: "Tardía" }));
      await reading;
    });

    expect(queryClient.getQueryData(detailKey)).toEqual(returned);
  });

  it("should keep the cache and content on a rejected mutation", async () => {
    const { adapters } = arrange();
    adapters.activities.updateActivity = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("conflicto"), { status: 409 }));
    const queryClient = createTestQueryClient();
    const detailKey = queryKeys.activityAdministrationDetail("admin-1", ACTIVITY_ID);
    const original = { id: ACTIVITY_ID, name: "Original" };
    queryClient.setQueryData(detailKey, original);

    const { result } = renderHookWithProviders(() => useActivityMutations(), {
      adapters,
      queryClient,
    });

    await expect(act(() => result.current.publish(ACTIVITY_ID))).rejects.toThrow();

    expect(queryClient.getQueryData(detailKey)).toEqual(original);
    expect(queryClient.getQueryState(detailKey)?.isInvalidated).toBe(false);
    await waitFor(() => expect(result.current.failure).toBe("conflict"));
  });

  it("should keep isPending active while invalidations resolve", async () => {
    const { adapters } = arrange();
    const queryClient = createTestQueryClient();
    const gate = deferred<void>();
    vi.spyOn(queryClient, "invalidateQueries").mockReturnValue(gate.promise);

    const { result } = renderHookWithProviders(() => useActivityMutations(), {
      adapters,
      queryClient,
    });

    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.publish(ACTIVITY_ID);
    });
    await waitFor(() => expect(adapters.activities.updateActivity).toHaveBeenCalled());
    expect(result.current.isPending).toBe(true);

    await act(async () => {
      gate.resolve();
      await pending;
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));
  });

  it("should not write private data into a session that changed mid-flight", async () => {
    const { adapters } = arrange();
    const delayed = deferred<ReturnType<typeof createAdministrativeActivityDetail>>();
    adapters.activities.cancelActivity = vi.fn().mockReturnValue(delayed.promise);
    const queryClient = createTestQueryClient();
    const detailKey = queryKeys.activityAdministrationDetail("admin-1", ACTIVITY_ID);
    const newSessionDetailKey = queryKeys.activityAdministrationDetail("admin-2", ACTIVITY_ID);
    const original = { id: ACTIVITY_ID, name: "Original" };
    queryClient.setQueryData(detailKey, original);

    const { result } = renderHookWithProviders(() => useActivityMutations(), {
      adapters,
      queryClient,
    });

    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.cancel(ACTIVITY_ID, {});
    });
    await waitFor(() => expect(adapters.activities.cancelActivity).toHaveBeenCalled());

    setSession("admin-2");
    await act(async () => {
      delayed.resolve(createAdministrativeActivityDetail({ id: ACTIVITY_ID, name: "Cancelada" }));
      await pending;
    });

    expect(queryClient.getQueryData(newSessionDetailKey)).toBeUndefined();
    expect(queryClient.getQueryData(detailKey)).toEqual(original);
  });

  it("should not write private data after a logout and re-login of the same identity", async () => {
    const { adapters } = arrange();
    const delayed = deferred<ReturnType<typeof createAdministrativeActivityDetail>>();
    adapters.activities.cancelActivity = vi.fn().mockReturnValue(delayed.promise);
    const queryClient = createTestQueryClient();
    const detailKey = queryKeys.activityAdministrationDetail("admin-1", ACTIVITY_ID);
    const original = { id: ACTIVITY_ID, name: "Original" };
    queryClient.setQueryData(detailKey, original);

    const { result } = renderHookWithProviders(() => useActivityMutations(), {
      adapters,
      queryClient,
    });

    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.cancel(ACTIVITY_ID, {});
    });
    await waitFor(() => expect(adapters.activities.cancelActivity).toHaveBeenCalled());

    act(() => {
      useSessionStore.getState().clearSession();
      setSession("admin-1");
    });
    await act(async () => {
      delayed.resolve(createAdministrativeActivityDetail({ id: ACTIVITY_ID, name: "Cancelada" }));
      await pending;
    });

    expect(queryClient.getQueryData(detailKey)).toEqual(original);
  });
});
