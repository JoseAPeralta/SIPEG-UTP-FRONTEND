import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import { createAdminUser, createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { renderWithProviders } from "@/test/render";

import { UsersView } from "./UsersView";

function page(
  items: ReturnType<typeof createAdminUser>[],
  overrides: Partial<{
    limit: number;
    page: number;
    total: number;
    totalPages: number;
  }> = {},
) {
  return { items, limit: 20, page: 1, total: items.length, totalPages: 1, ...overrides };
}

function renderView(configure?: (adapters: AppAdapters) => void) {
  useSessionStore.setState({
    currentUser: createAuthenticatedUser({ globalRole: "ADMIN", id: "admin-1" }),
    tokens: createAuthTokens(),
  });
  const adapters = createAppAdapters({ source: "mock" });
  configure?.(adapters);

  return { adapters, ...renderWithProviders(<UsersView />, { adapters }) };
}

afterEach(() => useSessionStore.getState().clearSession());

describe("UsersView", () => {
  it("lists the accounts returned by the adapter", async () => {
    renderView();

    expect(await screen.findByRole("heading", { level: 1, name: "Usuarios" })).toBeVisible();
    expect(await screen.findByText("Mariana Rodriguez")).toBeVisible();
    expect(screen.getByText("mariana.rodriguez@example.edu")).toBeVisible();
  });

  it("sends the role filter to the adapter and returns to the first page", async () => {
    const loadUsersPage = vi
      .fn()
      .mockResolvedValue(page([createAdminUser({ globalRole: "ADMIN", id: "user-1" })]));
    renderView((adapters) => {
      adapters.users = { ...adapters.users, loadUsersPage };
    });
    await screen.findByText("Mariana Rodriguez");
    const user = userEvent.setup();

    await user.selectOptions(screen.getByRole("combobox", { name: "Rol" }), "ADMIN");

    await waitFor(() =>
      expect(loadUsersPage).toHaveBeenLastCalledWith(
        expect.objectContaining({ globalRole: "ADMIN" }),
        1,
      ),
    );
  });

  it("sends the search term on submit", async () => {
    const loadUsersPage = vi.fn().mockResolvedValue(page([createAdminUser()]));
    renderView((adapters) => {
      adapters.users = { ...adapters.users, loadUsersPage };
    });
    await screen.findByText("Mariana Rodriguez");
    const user = userEvent.setup();

    await user.type(screen.getByRole("textbox", { name: "Buscar usuarios" }), "carlos");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    await waitFor(() =>
      expect(loadUsersPage).toHaveBeenLastCalledWith(expect.objectContaining({ q: "carlos" }), 1),
    );
  });

  it("requests the next page without unmounting the list", async () => {
    const loadUsersPage = vi
      .fn()
      .mockResolvedValue(page([createAdminUser()], { page: 1, total: 40, totalPages: 2 }));
    renderView((adapters) => {
      adapters.users = { ...adapters.users, loadUsersPage };
    });
    await screen.findByText("Mariana Rodriguez");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    await waitFor(() => expect(loadUsersPage).toHaveBeenLastCalledWith({}, 2));
  });

  it("creates a user with the contract fields and confirms the verification email", async () => {
    const createUser = vi
      .fn()
      .mockResolvedValue(createAdminUser({ firstName: "Nueva", id: "user-9", lastName: "Cuenta" }));
    renderView((adapters) => {
      adapters.users = { ...adapters.users, createUser };
    });
    await screen.findByText("Mariana Rodriguez");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Nuevo usuario" }));
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Nueva");
    await user.type(screen.getByRole("textbox", { name: "Apellido" }), "Cuenta");
    await user.type(
      screen.getByRole("textbox", { name: /correo electr[oó]nico/i }),
      "nueva@example.edu",
    );
    await user.type(screen.getByRole("textbox", { name: /c[eé]dula/i }), "8-111-2222");
    await user.type(screen.getByLabelText(/^contrase[nñ]a$/i), "contrasena-larga");
    await user.click(screen.getByRole("button", { name: "Guardar usuario" }));

    await waitFor(() =>
      expect(createUser).toHaveBeenCalledWith({
        email: "nueva@example.edu",
        firstName: "Nueva",
        identificationNumber: "8-111-2222",
        lastName: "Cuenta",
        password: "contrasena-larga",
        unitId: null,
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Cuenta creada para Nueva Cuenta. Se envió un correo de verificación.",
    );
  });

  it("explains a duplicate account without exposing the backend message", async () => {
    const createUser = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error("La operacion entra en conflicto."), { status: 409 }),
      );
    renderView((adapters) => {
      adapters.users = { ...adapters.users, createUser };
    });
    await screen.findByText("Mariana Rodriguez");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Nuevo usuario" }));
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Nueva");
    await user.type(screen.getByRole("textbox", { name: "Apellido" }), "Cuenta");
    await user.type(
      screen.getByRole("textbox", { name: /correo electr[oó]nico/i }),
      "nueva@example.edu",
    );
    await user.type(screen.getByRole("textbox", { name: /c[eé]dula/i }), "8-111-2222");
    await user.type(screen.getByLabelText(/^contrase[nñ]a$/i), "contrasena-larga");
    await user.click(screen.getByRole("button", { name: "Guardar usuario" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("El correo electrónico o la cédula ya están registrados.");
    expect(alert).not.toHaveTextContent("conflicto");
  });

  it("shows an empty state when no account matches", async () => {
    renderView((adapters) => {
      adapters.users = { ...adapters.users, loadUsersPage: vi.fn().mockResolvedValue(page([])) };
    });

    expect(await screen.findByText("No hay usuarios que coincidan con los filtros")).toBeVisible();
  });

  it("announces the local validation errors without contacting the adapter", async () => {
    const createUser = vi.fn();
    renderView((adapters) => {
      adapters.users = { ...adapters.users, createUser };
    });
    await screen.findByText("Mariana Rodriguez");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Nuevo usuario" }));
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "A");
    await user.type(screen.getByRole("textbox", { name: "Apellido" }), "B");
    await user.type(screen.getByRole("textbox", { name: /correo electr[oó]nico/i }), "a@b.co");
    await user.type(screen.getByRole("textbox", { name: /c[eé]dula/i }), "1");
    await user.type(screen.getByLabelText(/^contrase[nñ]a$/i), "corta");
    await user.click(screen.getByRole("button", { name: "Guardar usuario" }));

    expect(await screen.findByText("El nombre debe tener al menos 2 caracteres.")).toBeVisible();
    expect(screen.getByText("La contraseña debe tener al menos 12 caracteres.")).toBeVisible();
    expect(createUser).not.toHaveBeenCalled();
  });
});
