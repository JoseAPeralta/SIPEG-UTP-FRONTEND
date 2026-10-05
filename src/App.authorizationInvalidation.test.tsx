import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { App } from "@/App";
import { createAppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import type { CollaborationScope } from "@/features/collaboration/model/ownPermissions";
import type { UserScope, UserScopePermission } from "@/features/collaboration/model/userScopes";
import {
  createAuthenticatedUser,
  createAuthTokens,
  createEffectiveCollaborator,
  createUserScope,
} from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import { setupUser } from "@/test/user";
import { stubDesktopViewport } from "@/test/viewport";

const read: UserScopePermission = {
  name: "activity:read",
  origin: "LOCAL",
  validFrom: null,
  validUntil: null,
};
const grant: UserScopePermission = {
  name: "permission:grant",
  origin: "LOCAL",
  validFrom: null,
  validUntil: null,
};

type PerimeterState = {
  discovery: UserScope[];
  discoveryFails: boolean;
  permissions: UserScopePermission[];
};

function guardedActivity(permissions: UserScopePermission[]) {
  return createUserScope({
    id: "activity-guarded",
    name: "Actividad vigilada",
    permissions,
    type: "activity",
  });
}

/**
 * Adaptadores mutables que modelan el efecto del servidor: la retirada confirmada cambia lo que las
 * lecturas de autorización devuelven a partir de ese momento, sin reiniciar sesión ni recargar.
 */
function createPerimeter(options: { onRemoved?: (state: PerimeterState) => void } = {}) {
  const state: PerimeterState = {
    discovery: [guardedActivity([read, grant])],
    discoveryFails: false,
    permissions: [read, grant],
  };
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole: "USER", id: "actor" }),
    tokens: createAuthTokens(),
  });
  const adapters = createAppAdapters({ source: "mock" });
  adapters.userScopes.loadUserScopes = vi.fn(() =>
    state.discoveryFails
      ? Promise.reject(new Error("descubrimiento caido"))
      : Promise.resolve(state.discovery),
  );
  adapters.ownPermissions.loadOwnPermissions = vi.fn((scope: CollaborationScope) =>
    Promise.resolve({ scope, permissions: state.permissions }),
  );
  adapters.collaborators.loadCollaborators = vi.fn(() =>
    Promise.resolve([createEffectiveCollaborator()]),
  );
  adapters.collaborators.removeCollaborator = vi.fn(() => {
    options.onRemoved?.(state);
    return Promise.resolve();
  });
  return { adapters, state };
}

async function confirmRemoval(user: ReturnType<typeof setupUser>) {
  await user.click(await screen.findByRole("button", { name: "Retirar a Ana Pérez" }));
  await user.click(screen.getByRole("button", { name: "Confirmar retirada de Ana Pérez" }));
}

beforeEach(() => {
  stubDesktopViewport(true);
  useSessionStore.getState().clearSession();
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => useSessionStore.getState().clearSession());

it("retires collaborator management when delegation is revoked and keeps read authorization", async () => {
  const user = setupUser();
  const { adapters } = createPerimeter({
    onRemoved: (state) => {
      state.permissions = [read];
      state.discovery = [guardedActivity([read])];
    },
  });
  renderWithProviders(<App />, { adapters, route: "/operaciones/actividades/activity-guarded" });

  expect(await screen.findByRole("button", { name: "Agregar colaborador" })).toBeInTheDocument();
  await confirmRemoval(user);

  await waitFor(() =>
    expect(screen.queryByRole("button", { name: "Agregar colaborador" })).not.toBeInTheDocument(),
  );
  expect(await screen.findByText("Ver actividades")).toBeInTheDocument();
  expect(useSessionStore.getState().currentUser?.id).toBe("actor");
  expect(useSessionStore.getState().tokens?.accessToken).toBe("access-token");
});

it("retires the context, the selector option and the menu link when the last permission is revoked", async () => {
  const user = setupUser();
  const { adapters } = createPerimeter({
    onRemoved: (state) => {
      state.permissions = [];
      state.discovery = [];
    },
  });
  renderWithProviders(<App />, { adapters, route: "/operaciones/actividades/activity-guarded" });

  expect(await screen.findByRole("link", { name: "Mis operaciones" })).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: "Agregar colaborador" })).toBeInTheDocument();
  await confirmRemoval(user);

  expect(await screen.findByText("Contexto no autorizado")).toBeInTheDocument();
  await waitFor(() =>
    expect(screen.queryByRole("link", { name: "Mis operaciones" })).not.toBeInTheDocument(),
  );
  const select = screen.getByLabelText("Contexto operativo");
  await waitFor(() => expect(select).toBeDisabled());
  expect(
    within(select).queryByRole("option", { name: /Actividad vigilada/ }),
  ).not.toBeInTheDocument();
  expect(useSessionStore.getState().currentUser?.id).toBe("actor");
});

it("keeps the session and other contexts when one activity is revoked", async () => {
  const user = setupUser();
  const kept = createUserScope({
    id: "activity-kept",
    name: "Actividad conservada",
    permissions: [read],
    type: "activity",
  });
  const { adapters, state } = createPerimeter({
    onRemoved: (current) => {
      current.permissions = [read];
      current.discovery = current.discovery.filter((scope) => scope.id !== "activity-guarded");
    },
  });
  state.discovery = [...state.discovery, kept];
  renderWithProviders(<App />, { adapters, route: "/operaciones/actividades/activity-guarded" });

  await confirmRemoval(user);

  const select = await screen.findByLabelText("Contexto operativo");
  await waitFor(() =>
    expect(
      within(select).getByRole("option", { name: /Actividad conservada/ }),
    ).toBeInTheDocument(),
  );
  expect(
    within(select).queryByRole("option", { name: /Actividad vigilada/ }),
  ).not.toBeInTheDocument();
  expect(useSessionStore.getState().currentUser?.id).toBe("actor");
  expect(useSessionStore.getState().tokens?.accessToken).toBe("access-token");
});

it("does not restore authorized actions when the authorization refetch fails", async () => {
  const user = setupUser();
  const { adapters } = createPerimeter({
    onRemoved: (state) => {
      state.permissions = [read];
      state.discoveryFails = true;
    },
  });
  renderWithProviders(<App />, { adapters, route: "/operaciones/actividades/activity-guarded" });

  expect(await screen.findByRole("link", { name: "Mis operaciones" })).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: "Agregar colaborador" })).toBeInTheDocument();
  await confirmRemoval(user);

  expect(
    await screen.findByText("No se pudo confirmar el acceso a este contexto."),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Agregar colaborador" })).not.toBeInTheDocument();
  expect(screen.queryByText("Ver actividades")).not.toBeInTheDocument();
  await waitFor(() =>
    expect(screen.queryByRole("link", { name: "Mis operaciones" })).not.toBeInTheDocument(),
  );
  expect(useSessionStore.getState().currentUser?.id).toBe("actor");
  expect(useSessionStore.getState().tokens?.accessToken).toBe("access-token");
});
