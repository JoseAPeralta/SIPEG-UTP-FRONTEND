import { screen } from "@testing-library/react";
import { useEffect } from "react";
import { Route, Routes, useNavigate } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { createAppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createAuthTokens, createUserScope } from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import { OperationalScopesView } from "./OperationalScopesView";
import { OperationalScopeView } from "./OperationalScopeView";

afterEach(() => useSessionStore.getState().clearSession());
function adaptersFor(
  permissions: { name: string; origin: "LOCAL"; validFrom: null; validUntil: null }[] = [],
) {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole: "USER" }),
    tokens: createAuthTokens(),
  });
  const scope = createUserScope({
    type: "activity",
    id: "a-1",
    name: "Actividad privada",
    status: "DRAFT",
    permissions,
  });
  return {
    ...createAppAdapters({ source: "mock" }),
    userScopes: { loadUserScopes: vi.fn().mockResolvedValue([scope]) },
    ownPermissions: {
      loadOwnPermissions: vi
        .fn()
        .mockResolvedValue({ scope: { type: "activity", id: "a-1" }, permissions }),
    },
  };
}
const read = { name: "activity:read", origin: "LOCAL" as const, validFrom: null, validUntil: null };
it("discovers non-public scopes without querying the administrative catalog", async () => {
  const adapters = adaptersFor([read]);
  adapters.activityCatalog.loadCatalog = vi.fn();
  renderWithProviders(<OperationalScopesView />, { adapters });
  expect(await screen.findByRole("link", { name: "Abrir Actividad privada" })).toHaveAttribute(
    "href",
    "/operaciones/actividades/a-1",
  );
  expect(adapters.activityCatalog.loadCatalog).not.toHaveBeenCalled();
});
it("denies a direct foreign scope without fetching its permissions or collaborators", async () => {
  const adapters = adaptersFor([read]);
  adapters.collaborators.loadCollaborators = vi.fn();
  renderWithProviders(<OperationalScopeView scope={{ type: "activity", id: "foreign" }} />, {
    adapters,
  });
  expect(await screen.findByText("Contexto no autorizado")).toBeInTheDocument();
  expect(adapters.ownPermissions.loadOwnPermissions).not.toHaveBeenCalled();
  expect(adapters.collaborators.loadCollaborators).not.toHaveBeenCalled();
});
it("offers permission reading without collaborator PII for viewers", async () => {
  const adapters = adaptersFor([read]);
  adapters.collaborators.loadCollaborators = vi.fn();
  renderWithProviders(<OperationalScopeView scope={{ type: "activity", id: "a-1" }} />, {
    adapters,
  });
  expect(await screen.findByText("Ver actividades")).toBeInTheDocument();
  expect(screen.queryByText("Agregar persona")).not.toBeInTheDocument();
  expect(adapters.collaborators.loadCollaborators).not.toHaveBeenCalled();
});
/** Sonda de navegación: entrega el aviso de contexto retirado como estado de la ruta destino. */
function ContextLostNavigator() {
  const navigate = useNavigate();
  useEffect(() => {
    void navigate("/operaciones", { state: { contextLost: "Taller X" } });
  }, [navigate]);
  return null;
}
/** Sonda de navegación: entrega el anuncio de eliminación como estado de la ruta destino. */
function DeletionNoticeNavigator({ message }: { message: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    void navigate("/operaciones", { state: { activityDeletionNotice: message } });
  }, [message, navigate]);
  return null;
}
it("anuncia el contexto retirado que llega en el estado de la navegación", async () => {
  const adapters = adaptersFor([read]);
  renderWithProviders(
    <Routes>
      <Route path="/inicio" element={<ContextLostNavigator />} />
      <Route path="/operaciones" element={<OperationalScopesView />} />
    </Routes>,
    { adapters, route: "/inicio" },
  );
  expect(
    await screen.findByText(
      "El contexto «Taller X» ya no está disponible. Se retiró la selección.",
    ),
  ).toBeInTheDocument();
});
it("anuncia el borrador eliminado sin presentarlo como pérdida de acceso y enfoca el encabezado", async () => {
  const adapters = adaptersFor([read]);
  renderWithProviders(
    <Routes>
      <Route
        path="/inicio"
        element={<DeletionNoticeNavigator message="El borrador de «Taller X» se eliminó." />}
      />
      <Route path="/operaciones" element={<OperationalScopesView />} />
    </Routes>,
    { adapters, route: "/inicio" },
  );

  expect(await screen.findByText("El borrador de «Taller X» se eliminó.")).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 1, name: "Mis operaciones" })).toHaveFocus();
  expect(screen.queryByText(/ya no está disponible/i)).not.toBeInTheDocument();
});
it("does not render authorized actions after the own-permissions service denies access", async () => {
  const adapters = adaptersFor([{ ...read, name: "permission:grant" }]);
  adapters.ownPermissions.loadOwnPermissions = vi
    .fn()
    .mockRejectedValue(Object.assign(new Error("secret"), { status: 403 }));
  renderWithProviders(<OperationalScopeView scope={{ type: "activity", id: "a-1" }} />, {
    adapters,
  });
  expect(
    await screen.findByText("No se pudo confirmar el acceso a este contexto."),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Agregar colaborador" })).not.toBeInTheDocument();
  expect(screen.queryByText("secret")).not.toBeInTheDocument();
});
