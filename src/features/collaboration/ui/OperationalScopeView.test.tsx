import { act, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Route, Routes, useLocation } from "react-router";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { createQueryClient, queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createAuthTokens, createUserScope } from "@/test/factories";
import { renderWithProviders } from "@/test/render";

import type { CollaborationScope } from "../model/ownPermissions";
import type { UserScopePermission } from "../model/userScopes";
import { OperationalScopeView } from "./OperationalScopeView";

const scope: CollaborationScope = { type: "program", id: "program-1" };
const read: UserScopePermission = {
  name: "program:read",
  origin: "LOCAL",
  validFrom: null,
  validUntil: null,
};
const authorizedScope = createUserScope({
  id: "program-1",
  name: "Programa vigilado",
  permissions: [read],
  type: "program",
});

/** Marcador del destino: observa la navegación por el estado que entrega React Router. */
function ContextLostProbe() {
  const state = useLocation().state as { contextLost?: string } | null;
  return <p>contexto-perdido:{state?.contextLost ?? "sin-aviso"}</p>;
}

function buildAdapters(overrides: Partial<AppAdapters> = {}): AppAdapters {
  return {
    ...createAppAdapters({ source: "mock" }),
    userScopes: { loadUserScopes: vi.fn().mockResolvedValue([authorizedScope]) },
    ownPermissions: {
      loadOwnPermissions: vi.fn().mockResolvedValue({ scope, permissions: [read] }),
    },
    ...overrides,
  };
}

function renderScopeView(
  adapters: AppAdapters,
  queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  return renderWithProviders(
    <Routes>
      <Route
        path="/operaciones/programas/:programId"
        element={<OperationalScopeView scope={scope} />}
      />
      <Route path="/operaciones" element={<ContextLostProbe />} />
    </Routes>,
    { adapters, queryClient, route: "/operaciones/programas/program-1" },
  );
}

beforeEach(() => {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ id: "user-1" }),
    tokens: createAuthTokens(),
  });
});

afterEach(() => useSessionStore.getState().clearSession());

it("retira la selección y navega a /operaciones cuando el contexto desaparece tras una relectura exitosa", async () => {
  const loadUserScopes = vi.fn().mockResolvedValueOnce([authorizedScope]).mockResolvedValueOnce([]);
  const adapters = buildAdapters({ userScopes: { loadUserScopes } });
  const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });

  renderScopeView(adapters, queryClient);

  expect(
    await screen.findByRole("heading", { level: 1, name: "Programa vigilado" }),
  ).toBeInTheDocument();
  expect(await screen.findByText("Mis permisos en este contexto")).toBeInTheDocument();

  await act(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.userScopesScope("user-1") });
  });

  expect(await screen.findByText("contexto-perdido:Programa vigilado")).toBeInTheDocument();
  expect(screen.queryByText("Contexto no autorizado")).not.toBeInTheDocument();
});

it("no navega cuando la relectura del descubrimiento falla", async () => {
  const loadUserScopes = vi
    .fn()
    .mockResolvedValueOnce([authorizedScope])
    .mockRejectedValueOnce(new Error("descubrimiento caído"));
  const adapters = buildAdapters({ userScopes: { loadUserScopes } });
  const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });

  renderScopeView(adapters, queryClient);

  expect(
    await screen.findByRole("heading", { level: 1, name: "Programa vigilado" }),
  ).toBeInTheDocument();

  await act(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.userScopesScope("user-1") });
  });

  expect(
    await screen.findByText("No se pudo confirmar el acceso a este contexto."),
  ).toBeInTheDocument();
  expect(screen.queryByText(/contexto-perdido/)).not.toBeInTheDocument();
});

it("conserva el guard sin navegar cuando el acceso directo nunca estuvo autorizado", async () => {
  const adapters = buildAdapters({ userScopes: { loadUserScopes: vi.fn().mockResolvedValue([]) } });

  renderScopeView(adapters);

  expect(await screen.findByText("Contexto no autorizado")).toBeInTheDocument();
  expect(screen.queryByText(/contexto-perdido/)).not.toBeInTheDocument();
});

it("no considera autorizado un permiso vencido ni navega", async () => {
  const expired = createUserScope({
    id: "program-1",
    name: "Programa vencido",
    permissions: [{ ...read, validUntil: "2000-01-01T00:00:00.000Z" }],
    type: "program",
  });
  const loadOwnPermissions = vi.fn().mockResolvedValue({ scope, permissions: [read] });
  const adapters = buildAdapters({
    userScopes: { loadUserScopes: vi.fn().mockResolvedValue([expired]) },
    ownPermissions: { loadOwnPermissions },
  });

  renderScopeView(adapters);

  expect(await screen.findByText("Contexto no autorizado")).toBeInTheDocument();
  expect(loadOwnPermissions).not.toHaveBeenCalled();
  expect(screen.queryByText(/contexto-perdido/)).not.toBeInTheDocument();
});
