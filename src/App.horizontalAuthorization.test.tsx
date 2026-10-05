import { Box, Button, Text } from "@chakra-ui/react";
import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useLocation, useNavigate } from "react-router";

import { App } from "@/App";
import { createAppAdapters } from "@/app/adapters";
import type { CollaborationScope } from "@/features/collaboration/model/ownPermissions";
import type { UserScope, UserScopePermission } from "@/features/collaboration/model/userScopes";
import { useSessionStore } from "@/store/session";
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

const visibleActivity = createUserScope({
  id: "activity-visible",
  name: "Actividad visible",
  permissions: [read, grant],
  type: "activity",
});

/**
 * Cambia de URL sin recargar, como quien edita la barra de direcciones: es la contraparte en el
 * cliente del acceso directo, y permite observar si el guard vuelve a decidir y si los datos del
 * contexto anterior sobreviven al cambio.
 */
function NavigationProbe() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Box data-testid="navigation-probe">
      <Text data-testid="probe-path">{location.pathname}</Text>
      <Button onClick={() => navigate("/operaciones/actividades/activity-foreign")} type="button">
        Ir al contexto ajeno
      </Button>
      <Button onClick={() => navigate(-1)} type="button">
        Retroceder
      </Button>
    </Box>
  );
}

function sessionAsCollaborator() {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole: "USER", id: "actor" }),
    tokens: createAuthTokens(),
  });
}

/**
 * Frontera controlada: el descubrimiento y los permisos propios son los unicos autorizadores de la
 * UI, y el backend se simula por separado en cada prueba para comprobar que su rechazo prevalece.
 */
function createPerimeter(discovery: UserScope[] = [visibleActivity]) {
  sessionAsCollaborator();
  const adapters = createAppAdapters({ source: "mock" });
  const loadOwnPermissions = vi.fn((scope: CollaborationScope) =>
    Promise.resolve({ permissions: [read, grant], scope }),
  );

  adapters.userScopes = { loadUserScopes: vi.fn().mockResolvedValue(discovery) };
  adapters.ownPermissions = { loadOwnPermissions };
  adapters.collaborators = {
    addCollaborator: vi.fn(),
    changeCollaboratorRole: vi.fn(),
    grantPermission: vi.fn(),
    loadCollaborators: vi.fn().mockResolvedValue([createEffectiveCollaborator()]),
    removeCollaborator: vi.fn(),
    revokePermission: vi.fn(),
  };
  return { adapters, loadOwnPermissions };
}

beforeEach(() => {
  stubDesktopViewport(true);
  useSessionStore.getState().clearSession();
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => useSessionStore.getState().clearSession());

it("offers only discovered scopes and opens the exact context", async () => {
  const user = setupUser();
  const hiddenActivity = createUserScope({
    id: "activity-hidden",
    name: "Actividad oculta",
    permissions: [],
    type: "activity",
  });
  const { adapters, loadOwnPermissions } = createPerimeter([visibleActivity, hiddenActivity]);

  renderWithProviders(<App />, { adapters, route: "/operaciones" });

  expect(
    await screen.findByRole("link", { name: "Abrir Actividad visible" }, { timeout: 5000 }),
  ).toBeInTheDocument();
  expect(screen.queryByText("Actividad oculta")).not.toBeInTheDocument();
  expect(loadOwnPermissions).not.toHaveBeenCalled();

  await user.click(screen.getByRole("link", { name: "Abrir Actividad visible" }));

  expect(
    await screen.findByRole("heading", { level: 1, name: "Actividad visible" }, { timeout: 5000 }),
  ).toBeInTheDocument();
  await waitFor(() =>
    expect(loadOwnPermissions).toHaveBeenCalledWith({
      id: "activity-visible",
      type: "activity",
    }),
  );
  await waitFor(() =>
    expect(adapters.collaborators.loadCollaborators).toHaveBeenCalledWith({
      id: "activity-visible",
      type: "activity",
    }),
  );
});

it("states the absence of authorized work without querying any scope", async () => {
  const { adapters, loadOwnPermissions } = createPerimeter([]);

  renderWithProviders(<App />, { adapters, route: "/operaciones" });

  expect(
    await screen.findByText("Sin contextos de trabajo", undefined, { timeout: 5000 }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Ir a mi perfil" })).toBeInTheDocument();
  expect(loadOwnPermissions).not.toHaveBeenCalled();
  expect(adapters.collaborators.loadCollaborators).not.toHaveBeenCalled();
});

it.each([
  {
    discovery: [visibleActivity],
    label: "an activity outside discovery",
    route: "/operaciones/actividades/activity-foreign",
  },
  {
    discovery: [visibleActivity],
    label: "a program outside discovery",
    route: "/operaciones/programas/program-foreign",
  },
  {
    discovery: [createUserScope({ id: "shared", name: "Programa compartido", type: "program" })],
    label: "an activity whose id only exists as a program",
    route: "/operaciones/actividades/shared",
  },
  {
    discovery: [
      createUserScope({
        id: "shared",
        name: "Actividad compartida",
        permissions: [read],
        type: "activity",
      }),
    ],
    label: "a program whose id only exists as an activity",
    route: "/operaciones/programas/shared",
  },
])("denies $label opened by direct URL without querying its data", async ({ discovery, route }) => {
  const { adapters, loadOwnPermissions } = createPerimeter(discovery);

  renderWithProviders(<App />, { adapters, route });

  expect(
    await screen.findByText("Contexto no autorizado", undefined, { timeout: 5000 }),
  ).toBeInTheDocument();
  expect(loadOwnPermissions).not.toHaveBeenCalled();
  expect(adapters.collaborators.loadCollaborators).not.toHaveBeenCalled();
});

it("re-guards a client-side URL change and does not leak the previous context", async () => {
  const user = setupUser();
  const { adapters, loadOwnPermissions } = createPerimeter();

  renderWithProviders(
    <>
      <App />
      <NavigationProbe />
    </>,
    { adapters, route: "/operaciones/actividades/activity-visible" },
  );

  expect(
    await screen.findByRole("button", { name: "Agregar colaborador" }, { timeout: 5000 }),
  ).toBeInTheDocument();
  expect(await screen.findByText("Ana Pérez", undefined, { timeout: 5000 })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Ir al contexto ajeno" }));

  expect(
    await screen.findByText("Contexto no autorizado", undefined, { timeout: 5000 }),
  ).toBeInTheDocument();
  expect(screen.queryByText("Ana Pérez")).not.toBeInTheDocument();
  expect(loadOwnPermissions).toHaveBeenCalledTimes(1);

  await user.click(screen.getByRole("button", { name: "Retroceder" }));

  expect(
    await screen.findByRole("button", { name: "Agregar colaborador" }, { timeout: 5000 }),
  ).toBeInTheDocument();
  expect(await screen.findByText("Ana Pérez", undefined, { timeout: 5000 })).toBeInTheDocument();
  expect(screen.getByTestId("probe-path")).toHaveTextContent(
    "/operaciones/actividades/activity-visible",
  );
});

it("sends an anonymous deep link to the login page", async () => {
  renderWithProviders(<App />, { route: "/operaciones/actividades/activity-visible" });

  expect(
    await screen.findByRole(
      "heading",
      { level: 1, name: /^iniciar sesi[oó]n$/i },
      { timeout: 5000 },
    ),
  ).toBeInTheDocument();
  expect(screen.queryByText("Contexto no autorizado")).not.toBeInTheDocument();
});

it("keeps an authorized collaborator outside the administrative users module", async () => {
  const { adapters } = createPerimeter();
  adapters.users.loadUsers = vi.fn();
  adapters.users.loadUsersPage = vi.fn();
  adapters.users.getUser = vi.fn();

  renderWithProviders(<App />, { adapters, route: "/admin/usuarios/user-2" });

  expect(
    await screen.findByRole("heading", { level: 1, name: /[aá]rea personal/i }, { timeout: 5000 }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("navigation", { name: /navegacion del panel/i }),
  ).not.toBeInTheDocument();
  expect(adapters.users.loadUsers).not.toHaveBeenCalled();
  expect(adapters.users.loadUsersPage).not.toHaveBeenCalled();
  expect(adapters.users.getUser).not.toHaveBeenCalled();
});

it("denies actions when the backend rejects permission reading despite favorable discovery", async () => {
  const { adapters, loadOwnPermissions } = createPerimeter();
  loadOwnPermissions.mockRejectedValue(Object.assign(new Error("secret"), { status: 403 }));

  renderWithProviders(<App />, { adapters, route: "/operaciones/actividades/activity-visible" });

  expect(
    await screen.findByText("No se pudo confirmar el acceso a este contexto.", undefined, {
      timeout: 5000,
    }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Agregar colaborador" })).not.toBeInTheDocument();
  expect(screen.queryByText("secret")).not.toBeInTheDocument();
  expect(adapters.collaborators.loadCollaborators).not.toHaveBeenCalled();
  expect(useSessionStore.getState().currentUser?.id).toBe("actor");
});

it("keeps the backend 403 over the collaborator list without exposing its message", async () => {
  const { adapters } = createPerimeter();
  adapters.collaborators.loadCollaborators = vi
    .fn()
    .mockRejectedValue(Object.assign(new Error("secret"), { status: 403 }));

  renderWithProviders(<App />, { adapters, route: "/operaciones/actividades/activity-visible" });

  expect(
    await screen.findByText("No se pudieron consultar los colaboradores.", undefined, {
      timeout: 5000,
    }),
  ).toBeInTheDocument();
  expect(screen.queryByText("Agregar persona")).not.toBeInTheDocument();
  expect(screen.queryByText("Ana Pérez")).not.toBeInTheDocument();
  expect(screen.queryByText("secret")).not.toBeInTheDocument();
  expect(useSessionStore.getState().currentUser?.id).toBe("actor");
});
