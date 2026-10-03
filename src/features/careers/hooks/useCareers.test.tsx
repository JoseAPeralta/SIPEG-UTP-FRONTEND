import { waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters } from "@/app/adapters";
import { createQueryClient, queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createAuthTokens, createCareer } from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import { useCareers } from "./useCareers";

describe("useCareers", () => {
  afterEach(() => useSessionStore.getState().clearSession());

  it("should separate public and identity-scoped administrative caches", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ id: "user-1" }),
      tokens: createAuthTokens({ accessToken: "secret-token" }),
    });
    const adapters = createAppAdapters({ source: "mock" });
    const loadCareers = vi.fn().mockResolvedValue([createCareer()]);
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHookWithProviders(
      () => ({ administrative: useCareers("administrative"), public: useCareers("public") }),
      { adapters: { ...adapters, careers: { loadCareers } }, queryClient },
    );

    await waitFor(() => expect(result.current.public.isLoading).toBe(false));
    await waitFor(() => expect(result.current.administrative.isLoading).toBe(false));

    const keys = queryClient
      .getQueryCache()
      .getAll()
      .map((query) => query.queryKey);
    expect(keys).toContainEqual(queryKeys.publicCareers);
    expect(keys).toContainEqual(queryKeys.administrativeCareers("user-1"));
    expect(JSON.stringify(keys)).not.toContain("secret-token");
    expect(loadCareers).toHaveBeenCalledTimes(2);
  });
});
