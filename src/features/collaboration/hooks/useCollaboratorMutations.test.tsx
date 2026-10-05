import { act, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { createAppAdapters } from "@/app/adapters";
import { createQueryClient, queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";
import {
  createAuthenticatedUser,
  createAuthTokens,
  createEffectiveCollaborator,
} from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";
import { useCollaboratorMutations } from "./useCollaboratorMutations";
import { useOwnPermissions } from "./useOwnPermissions";
import { useUserScopes } from "./useUserScopes";

afterEach(() => useSessionStore.getState().clearSession());
it("invalidates permission and discovery caches after program mutations including inherited activity access", async () => {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ id: "actor" }),
    tokens: createAuthTokens(),
  });
  const scope = { type: "program" as const, id: "p" };
  const queryClient = createQueryClient();
  const keys = [
    queryKeys.collaborators("actor", scope),
    queryKeys.collaborators("actor", { type: "activity", id: "a" }),
    queryKeys.ownPermissions("actor", { type: "activity", id: "a" }),
    queryKeys.userScopes("actor"),
  ];
  for (const key of keys) queryClient.setQueryData(key, []);
  const adapters = createAppAdapters({ source: "mock" });
  adapters.collaborators.removeCollaborator = vi.fn().mockResolvedValue(undefined);
  const { result } = renderHookWithProviders(() => useCollaboratorMutations(scope), {
    adapters,
    queryClient,
  });
  await act(async () => {
    await result.current.remove("target");
  });
  await waitFor(() =>
    expect(keys.every((key) => queryClient.getQueryState(key)?.isInvalidated)).toBe(true),
  );
});

it("invalidates permission and discovery caches after grant and revoke commands", async () => {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ id: "actor" }),
    tokens: createAuthTokens(),
  });
  const scope = { type: "program" as const, id: "p" };
  const queryClient = createQueryClient();
  const keys = [
    queryKeys.collaborators("actor", scope),
    queryKeys.ownPermissions("actor", { type: "activity", id: "a" }),
    queryKeys.userScopes("actor"),
  ];
  for (const key of keys) queryClient.setQueryData(key, []);
  const adapters = createAppAdapters({ source: "mock" });
  adapters.collaborators.grantPermission = vi.fn().mockResolvedValue(createEffectiveCollaborator());
  adapters.collaborators.revokePermission = vi.fn().mockResolvedValue(undefined);
  const { result } = renderHookWithProviders(() => useCollaboratorMutations(scope), {
    adapters,
    queryClient,
  });
  await act(async () => {
    await result.current.grant({
      userId: "target",
      permission: "activity:update",
      validFrom: null,
      validUntil: null,
    });
  });
  await waitFor(() =>
    expect(keys.every((key) => queryClient.getQueryState(key)?.isInvalidated)).toBe(true),
  );
  for (const key of keys) queryClient.setQueryData(key, []);
  await act(async () => {
    await result.current.revoke({ userId: "target", permission: "activity:update" });
  });
  await waitFor(() =>
    expect(keys.every((key) => queryClient.getQueryState(key)?.isInvalidated)).toBe(true),
  );
});

type ForbiddenOperation = "add" | "change" | "remove" | "grant" | "revoke";

const forbiddenCalls: Record<
  ForbiddenOperation,
  (mutations: ReturnType<typeof useCollaboratorMutations>) => Promise<unknown>
> = {
  add: (mutations) => mutations.add({ userId: "target", role: "VIEWER" }),
  change: (mutations) => mutations.change("target", { role: "EDITOR" }),
  remove: (mutations) => mutations.remove("target"),
  grant: (mutations) =>
    mutations.grant({
      userId: "target",
      permission: "activity:read",
      validFrom: null,
      validUntil: null,
    }),
  revoke: (mutations) => mutations.revoke({ userId: "target", permission: "activity:read" }),
};

const forbiddenMessages: Record<ForbiddenOperation, string> = {
  add: "No tiene autorización para delegar esos permisos o modificar esta colaboración. Revise sus permisos y vuelva a consultar.",
  change:
    "No tiene autorización para delegar esos permisos o modificar esta colaboración. Revise sus permisos y vuelva a consultar.",
  remove:
    "No tiene autorización para delegar esos permisos o modificar esta colaboración. Revise sus permisos y vuelva a consultar.",
  grant:
    "No tiene autorización para otorgar ese permiso. Solo puede delegar permisos que posee y dentro de su propia vigencia.",
  revoke: "No tiene autorización para revocar ese permiso. Solo puede retirar permisos que posee.",
};

function authorizationRig(status: number) {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ id: "actor" }),
    tokens: createAuthTokens(),
  });
  const scope = { type: "activity" as const, id: "a" };
  const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
  const loadOwnPermissions = vi.fn().mockResolvedValue({ scope, permissions: [] });
  const loadUserScopes = vi.fn().mockResolvedValue([]);
  const adapters = createAppAdapters({ source: "mock" });
  const rejected = vi.fn().mockRejectedValue(Object.assign(new Error("rejected"), { status }));
  adapters.collaborators.addCollaborator = rejected;
  adapters.collaborators.changeCollaboratorRole = rejected;
  adapters.collaborators.removeCollaborator = rejected;
  adapters.collaborators.grantPermission = rejected;
  adapters.collaborators.revokePermission = rejected;
  adapters.ownPermissions = { loadOwnPermissions };
  adapters.userScopes = { loadUserScopes };
  const { result } = renderHookWithProviders(
    () => ({
      mutations: useCollaboratorMutations(scope),
      own: useOwnPermissions(scope),
      scopes: useUserScopes(),
    }),
    { adapters, queryClient },
  );
  return { loadOwnPermissions, loadUserScopes, result };
}

it.each(["add", "change", "remove", "grant", "revoke"] as const)(
  "reconciles authorization after a forbidden %s without closing the session",
  async (operation) => {
    const { loadOwnPermissions, loadUserScopes, result } = authorizationRig(403);

    await waitFor(() => {
      expect(loadOwnPermissions).toHaveBeenCalledTimes(1);
      expect(loadUserScopes).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await expect(forbiddenCalls[operation](result.current.mutations)).rejects.toThrow("rejected");
    });

    await waitFor(() => {
      expect(loadOwnPermissions).toHaveBeenCalledTimes(2);
      expect(loadUserScopes).toHaveBeenCalledTimes(2);
    });
    expect(result.current.mutations.failure).toBe(forbiddenMessages[operation]);
    expect(result.current.mutations.failure).not.toContain("rejected");
    expect(useSessionStore.getState().currentUser?.id).toBe("actor");
    expect(useSessionStore.getState().tokens?.accessToken).toBe("access-token");
  },
);

it("does not reconcile authorization after a non-forbidden failure", async () => {
  const { loadOwnPermissions, loadUserScopes, result } = authorizationRig(409);
  await waitFor(() => {
    expect(loadOwnPermissions).toHaveBeenCalledTimes(1);
    expect(loadUserScopes).toHaveBeenCalledTimes(1);
  });
  await act(async () => {
    await expect(result.current.mutations.remove("target")).rejects.toThrow("rejected");
  });
  await waitFor(() => expect(result.current.mutations.failure).not.toBeNull());
  expect(loadOwnPermissions).toHaveBeenCalledTimes(1);
  expect(loadUserScopes).toHaveBeenCalledTimes(1);
});
