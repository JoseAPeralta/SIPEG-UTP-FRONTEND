import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { App } from "@/App";
import { users } from "@/data/sipeg";
import { useSessionStore } from "@/store/session";
import { renderWithProviders } from "@/test/render";

const demoUser = users.find((user) => user.role === "admin");

if (!demoUser) {
  throw new Error("Demo administrator user was not found");
}

describe("App", () => {
  beforeEach(() => {
    useSessionStore.getState().logout();
    localStorage.clear();
  });

  it("should render the public landing page on the index route", async () => {
    renderWithProviders(<App />);

    expect(
      await screen.findByRole("heading", { level: 1, name: /descubre eventos academicos/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /navegacion principal/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^sipeg$/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /iniciar sesion/i })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(screen.queryByRole("link", { name: /panel de administracion/i })).not.toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toHaveTextContent(/sipeg/i);
  });

  it("should redirect protected dashboard routes to login when there is no session", async () => {
    renderWithProviders(<App />, { route: "/dashboard" });

    expect(
      await screen.findByRole("heading", { level: 1, name: /iniciar sesion en sipeg/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /iniciar sesion/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("should render the administration menu when a session exists", async () => {
    useSessionStore.getState().login(demoUser);

    renderWithProviders(<App />, { route: "/dashboard" });

    expect(
      await screen.findByRole("heading", { level: 1, name: /panel operativo sipeg/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /panel de administracion/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("button", { name: /cerrar sesion/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /iniciar sesion/i })).not.toBeInTheDocument();
  });

  it("should start and close the demo session from the navigation flow", async () => {
    const user = userEvent.setup();

    renderWithProviders(<App />, { route: "/login" });

    await user.click(
      await screen.findByRole("button", {
        name: /iniciar sesion/i,
      }),
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: /panel operativo sipeg/i }),
    ).toBeInTheDocument();
    expect(useSessionStore.getState().currentUser?.id).toBe(demoUser.id);

    await user.click(screen.getByRole("button", { name: /cerrar sesion/i }));

    expect(
      await screen.findByRole("heading", { level: 1, name: /descubre eventos academicos/i }),
    ).toBeInTheDocument();
    expect(useSessionStore.getState().currentUser).toBeNull();
    expect(screen.getByRole("link", { name: /iniciar sesion/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});
