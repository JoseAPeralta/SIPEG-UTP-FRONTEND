import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import { createAdminUser, createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { renderWithProviders } from "@/test/render";

import { UserDetailView } from "./UserDetailView";

function renderDetail(
  user = createAdminUser({ id: "user-1" }),
  configure?: (adapters: AppAdapters) => void,
  userId = "user-1",
) {
  useSessionStore.setState({
    currentUser: createAuthenticatedUser({ globalRole: "ADMIN", id: "admin-1" }),
    tokens: createAuthTokens(),
  });
  const adapters = createAppAdapters({ source: "mock" });
  adapters.users = { ...adapters.users, getUser: vi.fn().mockResolvedValue(user) };
  configure?.(adapters);

  return { adapters, ...renderWithProviders(<UserDetailView userId={userId} />, { adapters }) };
}

afterEach(() => useSessionStore.getState().clearSession());

describe("UserDetailView", () => {
  it("shows the identity in read-only and the editable relationship form", async () => {
    renderDetail(
      createAdminUser({
        email: "mariana.rodriguez@example.edu",
        identificationNumber: "8-888-1234",
        id: "user-1",
        unit: { code: "FISC", id: "fisc", name: "Facultad de Ingenieria de Sistemas" },
      }),
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: "Mariana Rodriguez" }),
    ).toBeVisible();
    expect(screen.getByLabelText(/correo electr[oó]nico/i)).toBeDisabled();
    expect(screen.getByLabelText(/c[eé]dula/i)).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Rol global" })).toBeEnabled();
  });

  it("updates only the changed contract fields", async () => {
    const updateUser = vi.fn().mockResolvedValue(createAdminUser({ globalRole: "ADMIN" }));
    renderDetail(createAdminUser({ globalRole: "USER", id: "user-2" }), (adapters) => {
      adapters.users = { ...adapters.users, updateUser };
    });
    await screen.findByRole("button", { name: "Guardar cambios" });
    const user = userEvent.setup();

    await user.selectOptions(screen.getByRole("combobox", { name: "Rol global" }), "ADMIN");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(updateUser).toHaveBeenCalledWith("user-2", { globalRole: "ADMIN" });
  });

  it("requires an explicit confirmation before deactivating and warns about revoked sessions", async () => {
    const updateUser = vi.fn().mockResolvedValue(createAdminUser({ isActive: false }));
    renderDetail(createAdminUser({ id: "user-2", isActive: true }), (adapters) => {
      adapters.users = { ...adapters.users, updateUser };
    });
    await screen.findByRole("button", { name: "Guardar cambios" });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Desactivar cuenta" }));

    const confirmation = await screen.findByRole("group", { name: "Confirmar desactivación" });
    expect(confirmation).toHaveTextContent(/se revocarán sus sesiones/i);
    expect(updateUser).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Confirmar desactivación/i }));

    expect(updateUser).toHaveBeenCalledWith("user-2", { isActive: false });
  });

  it("explains a safeguard conflict without exposing the backend message", async () => {
    const updateUser = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error("La operacion entra en conflicto."), { status: 409 }),
      );
    renderDetail(createAdminUser({ id: "user-1", isActive: true }), (adapters) => {
      adapters.users = { ...adapters.users, updateUser };
    });
    await screen.findByRole("button", { name: "Guardar cambios" });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Desactivar cuenta" }));
    await user.click(screen.getByRole("button", { name: /Confirmar desactivación/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/no puede desactivar su propia cuenta/i);
    expect(alert).not.toHaveTextContent("conflicto");
  });

  it("offers a way back when the account does not exist", async () => {
    useSessionStore.setState({
      currentUser: createAuthenticatedUser({ globalRole: "ADMIN", id: "admin-1" }),
      tokens: createAuthTokens(),
    });
    const adapters = createAppAdapters({ source: "mock" });
    adapters.users = {
      ...adapters.users,
      getUser: vi.fn().mockRejectedValue(Object.assign(new Error("no existe"), { status: 404 })),
    };

    renderWithProviders(<UserDetailView userId="missing" />, { adapters });

    expect(await screen.findByText("La cuenta solicitada ya no existe")).toBeVisible();
    expect(screen.getByRole("link", { name: /volver al listado de usuarios/i })).toHaveAttribute(
      "href",
      "/admin/usuarios",
    );
  });
});
