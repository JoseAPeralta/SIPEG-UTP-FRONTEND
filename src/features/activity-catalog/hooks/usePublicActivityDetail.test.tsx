import { act, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import {
  createQueryClient,
  isPersistedQueryKey,
  PUBLIC_CATALOG_STALE_TIME_MS,
  queryKeys,
} from "@/app/query";
import type { PublicActivityDetail } from "@/features/activity-catalog/model/publicActivityDetail";
import { useSessionStore } from "@/store/session";
import {
  createAuthenticatedUser,
  createAuthTokens,
  createPublicActivityDetail,
} from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import { usePublicActivityDetail } from "./usePublicActivityDetail";

type GetPublicActivity = AppAdapters["publicActivityCatalog"]["getPublicActivity"];

function detailAdapters(getPublicActivity: GetPublicActivity): AppAdapters {
  const adapters = createAppAdapters({ source: "mock" });

  return {
    ...adapters,
    publicActivityCatalog: { ...adapters.publicActivityCatalog, getPublicActivity },
  };
}

function immediateRetryQueryClient() {
  return createQueryClient({ defaultOptions: { queries: { retry: false } } });
}

describe("usePublicActivityDetail", () => {
  afterEach(() => useSessionStore.getState().clearSession());

  it("should not request a detail without an id", async () => {
    const getPublicActivity = vi.fn<GetPublicActivity>(() =>
      Promise.resolve(createPublicActivityDetail()),
    );
    const { result } = renderHookWithProviders(() => usePublicActivityDetail("  "), {
      adapters: detailAdapters(getPublicActivity),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getPublicActivity).not.toHaveBeenCalled();
    expect(result.current.activity).toBeNull();
    expect(result.current.notFound).toBe(true);
  });

  it("should load the public detail by id", async () => {
    const detail = createPublicActivityDetail({ id: "activity-7" });
    const getPublicActivity = vi.fn<GetPublicActivity>(() => Promise.resolve(detail));
    const { result } = renderHookWithProviders(() => usePublicActivityDetail("activity-7"), {
      adapters: detailAdapters(getPublicActivity),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getPublicActivity).toHaveBeenCalledWith("activity-7");
    expect(result.current.activity).toEqual(detail);
    expect(result.current.error).toBeNull();
    expect(result.current.notFound).toBe(false);
  });

  it("should report an unavailable activity as not found", async () => {
    const getPublicActivity = vi.fn<GetPublicActivity>(() => Promise.resolve(null));
    const { result } = renderHookWithProviders(() => usePublicActivityDetail("missing"), {
      adapters: detailAdapters(getPublicActivity),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.activity).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.notFound).toBe(true);
  });

  it("should expose the failure and retry with a single new request", async () => {
    const detail = createPublicActivityDetail({ id: "activity-7" });
    const getPublicActivity = vi
      .fn<GetPublicActivity>()
      .mockRejectedValueOnce(new Error("sin conexion"))
      .mockResolvedValue(detail);
    const { result } = renderHookWithProviders(() => usePublicActivityDetail("activity-7"), {
      adapters: detailAdapters(getPublicActivity),
      queryClient: immediateRetryQueryClient(),
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error?.message).toBe("sin conexion");
    expect(result.current.notFound).toBe(false);
    expect(result.current.activity).toBeNull();

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.error).toBeNull());
    expect(result.current.activity).toEqual(detail);
    expect(getPublicActivity).toHaveBeenCalledTimes(2);
  });

  it("should deduplicate the same id into a single request", async () => {
    const detail = createPublicActivityDetail({ id: "activity-7" });
    const getPublicActivity = vi.fn<GetPublicActivity>(() => Promise.resolve(detail));
    const { result } = renderHookWithProviders(
      () => ({
        first: usePublicActivityDetail("activity-7"),
        second: usePublicActivityDetail("activity-7"),
      }),
      { adapters: detailAdapters(getPublicActivity), queryClient: immediateRetryQueryClient() },
    );

    await waitFor(() => expect(result.current.first.activity).toEqual(detail));

    expect(getPublicActivity).toHaveBeenCalledTimes(1);
    expect(result.current.second.activity).toEqual(detail);
  });

  it("should keep a cache entry per id", async () => {
    let activityId = "activity-1";
    const getPublicActivity = vi.fn<GetPublicActivity>((id) =>
      Promise.resolve(createPublicActivityDetail({ id })),
    );
    const { result, rerender } = renderHookWithProviders(
      () => usePublicActivityDetail(activityId),
      { adapters: detailAdapters(getPublicActivity), queryClient: immediateRetryQueryClient() },
    );

    await waitFor(() => expect(result.current.activity?.id).toBe("activity-1"));

    activityId = "activity-2";
    rerender();

    await waitFor(() => expect(result.current.activity?.id).toBe("activity-2"));
    expect(getPublicActivity).toHaveBeenCalledTimes(2);
  });

  it("should never show the previous detail while another id loads", async () => {
    let activityId = "activity-1";
    const never = new Promise<PublicActivityDetail>(() => undefined);
    const getPublicActivity = vi.fn<GetPublicActivity>((id) =>
      id === "activity-1" ? Promise.resolve(createPublicActivityDetail({ id })) : never,
    );
    const { result, rerender } = renderHookWithProviders(
      () => usePublicActivityDetail(activityId),
      { adapters: detailAdapters(getPublicActivity), queryClient: immediateRetryQueryClient() },
    );

    await waitFor(() => expect(result.current.activity?.id).toBe("activity-1"));

    activityId = "activity-2";
    rerender();

    await waitFor(() => expect(getPublicActivity).toHaveBeenCalledTimes(2));
    expect(result.current.activity).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.notFound).toBe(false);
  });

  it("should follow the agenda caching policy and stay out of the persisted cache", async () => {
    const getPublicActivity = vi.fn<GetPublicActivity>(() =>
      Promise.resolve(createPublicActivityDetail({ id: "activity-7" })),
    );
    const queryClient = createQueryClient();
    const { result } = renderHookWithProviders(() => usePublicActivityDetail("activity-7"), {
      adapters: detailAdapters(getPublicActivity),
      queryClient,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const options = (queryClient
      .getQueryCache()
      .find({ queryKey: queryKeys.publicActivityDetail("activity-7") })?.options ?? {}) as {
      refetchOnWindowFocus?: boolean;
      staleTime?: number;
    };

    expect(options.refetchOnWindowFocus).toBe(false);
    expect(options.staleTime).toBe(PUBLIC_CATALOG_STALE_TIME_MS);
    expect(isPersistedQueryKey(queryKeys.publicActivityDetail("activity-7"))).toBe(false);
  });

  it("should not clear the session when the public detail fails", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ id: "user-1" }),
      tokens: createAuthTokens({ accessToken: "secret-token" }),
    });
    const getPublicActivity = vi.fn<GetPublicActivity>(() =>
      Promise.reject(Object.assign(new Error("Su sesion no esta autorizada."), { status: 401 })),
    );
    const { result } = renderHookWithProviders(() => usePublicActivityDetail("activity-7"), {
      adapters: detailAdapters(getPublicActivity),
      queryClient: immediateRetryQueryClient(),
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(useSessionStore.getState().currentUser?.id).toBe("user-1");
    expect(useSessionStore.getState().tokens?.accessToken).toBe("secret-token");
    expect(JSON.stringify(queryKeys.publicActivityDetail("activity-7"))).not.toContain(
      "secret-token",
    );
  });
});
