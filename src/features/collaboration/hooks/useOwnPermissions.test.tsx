import { waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { createAppAdapters } from "@/app/adapters";
import { createQueryClient, queryKeys, isPersistedQueryKey } from "@/app/query";
import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";
import { useOwnPermissions } from "./useOwnPermissions";

afterEach(() => useSessionStore.getState().clearSession());
const scope = { type: "activity" as const, id: "a-1" };
it("does not query without identity", () => {
  const loadOwnPermissions = vi.fn();
  renderHookWithProviders(() => useOwnPermissions(scope), {
    adapters: { ...createAppAdapters({ source: "mock" }), ownPermissions: { loadOwnPermissions } },
  });
  expect(loadOwnPermissions).not.toHaveBeenCalled();
});
it("caches only under the current identity and exact scope", async () => {
  useSessionStore
    .getState()
    .setSession({ currentUser: createAuthenticatedUser(), tokens: createAuthTokens() });
  const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
  const loadOwnPermissions = vi.fn().mockResolvedValue({ scope, permissions: [] });
  const { result } = renderHookWithProviders(() => useOwnPermissions(scope), {
    queryClient,
    adapters: { ...createAppAdapters({ source: "mock" }), ownPermissions: { loadOwnPermissions } },
  });
  await waitFor(() => expect(result.current.data).toEqual({ scope, permissions: [] }));
  const key = queryKeys.ownPermissions(useSessionStore.getState().currentUser!.id, scope);
  expect(queryClient.getQueryData(key)).toEqual({ scope, permissions: [] });
  expect(isPersistedQueryKey(key)).toBe(false);
});
