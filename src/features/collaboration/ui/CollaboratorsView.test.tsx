import { screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { createAppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import {
  createAuthenticatedUser,
  createAuthTokens,
  createEffectiveCollaborator,
} from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import { setupUser } from "@/test/user";
import type { EffectiveCollaborator } from "../model/collaborators";
import { CollaboratorsView } from "./CollaboratorsView";

afterEach(() => useSessionStore.getState().clearSession());
const scope = { type: "activity" as const, id: "activity-1" };
const person = createEffectiveCollaborator();
function setup(
  canManage = true,
  collaborator: EffectiveCollaborator | null = person,
  readOnly = false,
) {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole: "USER" }),
    tokens: createAuthTokens(),
  });
  const adapters = createAppAdapters({ source: "mock" });
  adapters.users.loadUsersPage = vi.fn(adapters.users.loadUsersPage);
  adapters.collaborators = {
    loadCollaborators: vi.fn().mockResolvedValue(collaborator ? [collaborator] : []),
    addCollaborator: vi.fn().mockResolvedValue(person),
    changeCollaboratorRole: vi.fn().mockResolvedValue(person),
    removeCollaborator: vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("secret"), { status: 409 })),
    grantPermission: vi.fn().mockResolvedValue(person),
    revokePermission: vi.fn().mockResolvedValue(undefined),
  };
  renderWithProviders(
    <CollaboratorsView scope={scope} canManage={canManage} readOnly={readOnly} />,
    { adapters },
  );
  return adapters;
}
it("requires confirmation and explains conflicts without removing the row", async () => {
  const user = setupUser();
  const adapters = setup();
  await user.click(await screen.findByRole("button", { name: "Retirar a Ana Pérez" }));
  expect(adapters.collaborators.removeCollaborator).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Confirmar retirada de Ana Pérez" }));
  expect(
    await screen.findByText(/El contexto debe conservar una persona capaz de delegar/),
  ).toBeInTheDocument();
  expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
  expect(screen.queryByText("secret")).not.toBeInTheDocument();
});
it("adds by identifier for a delegator without querying administrative users", async () => {
  const user = setupUser();
  const adapters = setup();
  adapters.users.loadUsersPage = vi.fn();
  await user.type(await screen.findByLabelText("Identificador de la persona"), "user-3");
  await user.click(screen.getByRole("button", { name: "Agregar colaborador" }));
  expect(adapters.collaborators.addCollaborator).toHaveBeenCalledWith(scope, {
    userId: "user-3",
    role: "VIEWER",
  });
  expect(adapters.users.loadUsersPage).not.toHaveBeenCalled();
  expect(await screen.findByText("Colaborador agregado.")).toBeInTheDocument();
});
it("does not load collaborator PII without delegation capability", () => {
  const adapters = setup(false);
  expect(adapters.collaborators.loadCollaborators).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Agregar colaborador" })).not.toBeInTheDocument();
});
it("submits only the selected role", async () => {
  const user = setupUser();
  const adapters = setup();
  await user.selectOptions(await screen.findByLabelText("Rol de Ana Pérez"), "EDITOR");
  await user.click(screen.getByRole("button", { name: "Guardar rol de Ana Pérez" }));
  expect(adapters.collaborators.changeCollaboratorRole).toHaveBeenCalledWith(scope, "target", {
    role: "EDITOR",
  });
});
it("grants a permission with a validity window converted to instants", async () => {
  const user = setupUser();
  const adapters = setup();
  await user.click(await screen.findByText("Ver permisos de Ana Pérez"));
  await user.selectOptions(screen.getByLabelText("Permiso a otorgar"), "program:read");
  await user.type(screen.getByLabelText("Fin de vigencia (opcional)"), "2027-01-01T10:00");
  await user.click(screen.getByRole("button", { name: "Otorgar permiso" }));
  expect(adapters.collaborators.grantPermission).toHaveBeenCalledWith(scope, {
    userId: "target",
    permission: "program:read",
    validFrom: null,
    validUntil: new Date(2027, 0, 1, 10, 0).toISOString(),
  });
  expect(await screen.findByText("Permiso otorgado.")).toBeInTheDocument();
});
it("rejects a window that is not future without calling the adapter", async () => {
  const user = setupUser();
  const adapters = setup();
  await user.click(await screen.findByText("Ver permisos de Ana Pérez"));
  await user.type(screen.getByLabelText("Fin de vigencia (opcional)"), "2020-01-01T10:00");
  await user.click(screen.getByRole("button", { name: "Otorgar permiso" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/futuro/);
  expect(adapters.collaborators.grantPermission).not.toHaveBeenCalled();
});
it("revokes local grants with an inheritance warning and never offers inherited-only access", async () => {
  const user = setupUser();
  const adapters = setup(
    true,
    createEffectiveCollaborator({
      permissions: [
        {
          name: "activity:update",
          source: "OVERRIDE",
          origin: "BOTH",
          effective: true,
          validFrom: null,
          validUntil: null,
        },
        {
          name: "activity:read",
          source: "ROLE_DEFAULT",
          origin: "INHERITED",
          effective: true,
          validFrom: null,
          validUntil: null,
        },
      ],
    }),
  );
  await user.click(await screen.findByText("Ver permisos de Ana Pérez"));
  expect(
    screen.getByText("El acceso heredado del programa continuará vigente."),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Revocar Ver actividades" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Revocar Actualizar actividades" }));
  expect(adapters.collaborators.revokePermission).toHaveBeenCalledWith(scope, {
    userId: "target",
    permission: "activity:update",
  });
  expect(await screen.findByText("Permiso revocado.")).toBeInTheDocument();
});
it("renders an archived program as read-only without mutation controls", async () => {
  const user = setupUser();
  const adapters = setup(
    true,
    createEffectiveCollaborator({
      permissions: [
        {
          name: "activity:read",
          source: "ROLE_DEFAULT",
          origin: "INHERITED",
          effective: true,
          validFrom: null,
          validUntil: null,
        },
      ],
    }),
    true,
  );
  expect(await screen.findByText("Ana Pérez")).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent(
    "El programa está archivado. Puede consultar sus colaboradores, pero no modificarlos.",
  );
  expect(screen.queryByRole("button", { name: "Agregar colaborador" })).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Guardar rol de Ana Pérez" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Retirar a Ana Pérez" })).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Permiso a otorgar")).not.toBeInTheDocument();
  await user.click(screen.getByText("Ver permisos de Ana Pérez"));
  expect(screen.getByText("Heredado del programa")).toBeInTheDocument();
  expect(adapters.collaborators.loadCollaborators).toHaveBeenCalledWith(scope);
  expect(adapters.collaborators.addCollaborator).not.toHaveBeenCalled();
  expect(adapters.collaborators.changeCollaboratorRole).not.toHaveBeenCalled();
  expect(adapters.collaborators.removeCollaborator).not.toHaveBeenCalled();
  expect(adapters.collaborators.grantPermission).not.toHaveBeenCalled();
  expect(adapters.collaborators.revokePermission).not.toHaveBeenCalled();
  expect(adapters.users.loadUsersPage).not.toHaveBeenCalled();
});
it("explains an empty archived program without inviting to the add form", async () => {
  const adapters = setup(true, null, true);
  expect(
    await screen.findByText("El programa no tiene colaboraciones locales registradas."),
  ).toBeInTheDocument();
  expect(screen.getByText("Sin colaboradores locales")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Agregar colaborador" })).not.toBeInTheDocument();
  expect(screen.queryByText(/Puede agregar una persona/)).not.toBeInTheDocument();
  expect(adapters.collaborators.loadCollaborators).toHaveBeenCalledWith(scope);
});
