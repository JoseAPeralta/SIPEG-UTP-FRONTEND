import { screen } from "@testing-library/react";
import { setupUser } from "@/test/user";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router";

import { createAppAdapters, type AppAdapters, type AuthAdapter } from "@/app/adapters";
import { AuthError } from "@/features/auth";
import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { renderWithProviders } from "@/test/render";

import { LoginPage } from "./LoginPage";

function createAuthSpy(overrides: Partial<AuthAdapter> = {}): AuthAdapter {
  return {
    ...createAppAdapters({ source: "mock" }).auth,
    ...overrides,
  };
}

/**
 * The page is rendered inside a router that declares the two possible destinations, so the test observes
 * where the page actually navigates instead of re-implementing the redirect rule.
 */
function renderLoginRoute(adapters?: AppAdapters) {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<h1>Panel operativo SIPEG</h1>} />
      <Route path="/perfil" element={<h1>Área personal</h1>} />
    </Routes>,
    { adapters, route: "/login" },
  );
}

function signInAs(globalRole: "ADMIN" | "USER") {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole }),
    tokens: createAuthTokens(),
  });
}

describe("LoginPage", () => {
  beforeEach(() => {
    useSessionStore.getState().clearSession();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("should send an already authenticated administrator to the operational panel", () => {
    signInAs("ADMIN");

    renderLoginRoute();

    expect(
      screen.getByRole("heading", { level: 1, name: /panel operativo sipeg/i }),
    ).toBeInTheDocument();
  });

  it("should send an already authenticated standard user to the personal area", () => {
    signInAs("USER");

    renderLoginRoute();

    expect(
      screen.getByRole("heading", { level: 1, name: /[aá]rea personal/i }),
    ).toBeInTheDocument();
  });

  it("should send a standard user to the personal area after authenticating", async () => {
    const user = setupUser();
    const adapters = createAppAdapters({ source: "mock" });
    const auth = createAuthSpy({
      loadCurrentUser: vi.fn().mockResolvedValue(createAuthenticatedUser({ globalRole: "USER" })),
      login: vi.fn().mockResolvedValue(createAuthTokens()),
    });

    renderLoginRoute({ ...adapters, auth });

    await user.type(
      await screen.findByRole("textbox", { name: /correo electr[oó]nico/i }),
      "user@example.edu",
    );
    await user.type(screen.getByLabelText(/contrase[nñ]a/i), "sipeg-demo");
    await user.click(screen.getByRole("button", { name: /iniciar sesi[oó]n/i }));

    expect(
      await screen.findByRole("heading", { level: 1, name: /[aá]rea personal/i }),
    ).toBeInTheDocument();
  });

  it("should send an administrator to the operational panel after authenticating", async () => {
    const user = setupUser();
    const adapters = createAppAdapters({ source: "mock" });
    const auth = createAuthSpy({
      loadCurrentUser: vi.fn().mockResolvedValue(createAuthenticatedUser({ globalRole: "ADMIN" })),
      login: vi.fn().mockResolvedValue(createAuthTokens()),
    });

    renderLoginRoute({ ...adapters, auth });

    await user.type(
      await screen.findByRole("textbox", { name: /correo electr[oó]nico/i }),
      "admin@example.edu",
    );
    await user.type(screen.getByLabelText(/contrase[nñ]a/i), "sipeg-demo");
    await user.click(screen.getByRole("button", { name: /iniciar sesi[oó]n/i }));

    expect(
      await screen.findByRole("heading", { level: 1, name: /panel operativo sipeg/i }),
    ).toBeInTheDocument();
  });

  it("should explain why the session ended", () => {
    useSessionStore.getState().endSession("expired");

    renderLoginRoute();

    expect(screen.getByRole("status")).toHaveTextContent(/su sesion expiro.*inicie sesion/i);
  });

  it("should announce a throttled session without offering a retry countdown", () => {
    useSessionStore.getState().endSession("throttled");

    renderLoginRoute();

    expect(screen.getByRole("status")).toHaveTextContent(/demasiados intentos/i);
    expect(screen.queryByText(/\d+\s*(segundos|minutos)\s*de espera/i)).toBeNull();
  });

  it("should announce a service problem without blaming the account", () => {
    useSessionStore.getState().endSession("unavailable");

    renderLoginRoute();

    expect(screen.getByRole("status")).toHaveTextContent(/no fue posible restablecer su sesion/i);
    expect(screen.getByRole("status")).not.toHaveTextContent(/expir/i);
  });

  it("should raise no notice on a first visit", () => {
    renderLoginRoute();

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("should show a throttled message after too many attempts", async () => {
    const user = setupUser();
    const auth = createAuthSpy({
      login: vi.fn().mockRejectedValue(new AuthError("throttled")),
    });

    renderLoginRoute({ ...createAppAdapters({ source: "mock" }), auth });

    await user.type(
      await screen.findByRole("textbox", { name: /correo electr[oó]nico/i }),
      "user@example.edu",
    );
    await user.type(screen.getByLabelText(/contrase[nñ]a/i), "sipeg-demo");
    await user.click(screen.getByRole("button", { name: /iniciar sesi[oó]n/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/demasiados intentos/i);
  });

  it("should answer an inactive account without revealing its state", async () => {
    const user = setupUser();
    const auth = createAuthSpy({
      login: vi.fn().mockRejectedValue(new AuthError("rejected")),
    });

    renderLoginRoute({ ...createAppAdapters({ source: "mock" }), auth });

    await user.type(
      await screen.findByRole("textbox", { name: /correo electr[oó]nico/i }),
      "user@example.edu",
    );
    await user.type(screen.getByLabelText(/contrase[nñ]a/i), "sipeg-demo");
    await user.click(screen.getByRole("button", { name: /iniciar sesi[oó]n/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/no fue posible iniciar sesi[oó]n/i);
    expect(alert).not.toHaveTextContent(/inactiv|42|user_id/i);
  });

  it("should answer an unverified email exactly like a wrong password", async () => {
    const user = setupUser();
    const auth = createAuthSpy({
      login: vi.fn().mockRejectedValue(new AuthError("rejected")),
    });

    renderLoginRoute({ ...createAppAdapters({ source: "mock" }), auth });

    await user.type(
      await screen.findByRole("textbox", { name: /correo electr[oó]nico/i }),
      "user@example.edu",
    );
    await user.type(screen.getByLabelText(/contrase[nñ]a/i), "sipeg-demo");
    await user.click(screen.getByRole("button", { name: /iniciar sesi[oó]n/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/no fue posible iniciar sesi[oó]n/i);
    expect(alert).not.toHaveTextContent(/verificad/i);
  });

  it("should not report a connectivity problem as invalid credentials", async () => {
    const user = setupUser();
    const auth = createAuthSpy({
      login: vi.fn().mockRejectedValue(new AuthError("unavailable")),
    });

    renderLoginRoute({ ...createAppAdapters({ source: "mock" }), auth });

    await user.type(
      await screen.findByRole("textbox", { name: /correo electr[oó]nico/i }),
      "user@example.edu",
    );
    await user.type(screen.getByLabelText(/contrase[nñ]a/i), "sipeg-demo");
    await user.click(screen.getByRole("button", { name: /iniciar sesi[oó]n/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/no se pudo completar la solicitud/i);
    expect(alert).not.toHaveTextContent(/datos de acceso/i);
  });
});
