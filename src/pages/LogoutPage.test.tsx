import { screen } from "@testing-library/react";
import { setupUser } from "@/test/user";
import { Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { createAppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { renderWithProviders } from "@/test/render";

import { LogoutPage } from "./LogoutPage";

describe("LogoutPage", () => {
  it("keeps a failed logout visible and lets the user retry revocation", async () => {
    const user = setupUser();
    const adapters = createAppAdapters({ source: "mock" });
    const logout = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
    useSessionStore
      .getState()
      .setSession({ currentUser: createAuthenticatedUser(), tokens: createAuthTokens() });
    renderWithProviders(
      <Routes>
        <Route path="/logout" element={<LogoutPage />} />
        <Route path="/" element={<h1>Inicio</h1>} />
      </Routes>,
      { adapters: { ...adapters, auth: { ...adapters.auth, logout } }, route: "/logout" },
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo cerrar la sesion en el servidor",
    );
    expect(screen.queryByRole("heading", { name: "Inicio" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reintentar cierre de sesion" }));
    expect(await screen.findByRole("heading", { name: "Inicio" })).toBeInTheDocument();
    expect(logout).toHaveBeenCalledTimes(2);
    expect(useSessionStore.getState().status).toBe("anonymous");
  });
});
