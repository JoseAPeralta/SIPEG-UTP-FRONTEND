import { screen } from "@testing-library/react";
import { setupUser } from "@/test/user";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";

import { LoginForm } from "./LoginForm";

describe("LoginForm", () => {
  it("should present itself as access to the account and not as administrative access", () => {
    renderWithProviders(<LoginForm onSubmit={vi.fn()} />);

    expect(screen.getByText(/acceso a su cuenta/i)).toBeInTheDocument();
    expect(screen.queryByText(/acceso administrativo/i)).not.toBeInTheDocument();
  });

  it("should offer email verification guidance without claiming a diagnosis", () => {
    renderWithProviders(<LoginForm onSubmit={vi.fn()} />);

    const guidance = screen.getByText(/si acaba de registrarse, revise su correo/i);

    expect(guidance).toBeInTheDocument();
    expect(guidance).not.toHaveTextContent(/su cuenta no esta|verifique su cuenta primero/i);
  });

  it("should submit trimmed credentials", async () => {
    const user = setupUser();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<LoginForm onSubmit={onSubmit} />);

    expect(
      screen.getByText(/use las credenciales de su cuenta institucional/i),
    ).toBeInTheDocument();

    await user.type(
      screen.getByRole("textbox", { name: /correo electr[oó]nico/i }),
      " admin@example.edu ",
    );
    await user.type(screen.getByLabelText(/contrase[nñ]a/i), "secret");
    await user.click(screen.getByRole("button", { name: /iniciar sesi[oó]n/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: "admin@example.edu",
      password: "secret",
    });
  });

  it("should present authentication errors as alerts", () => {
    renderWithProviders(
      <LoginForm errorMessage="El correo o la contrasena no son correctos." onSubmit={vi.fn()} />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "El correo o la contrasena no son correctos.",
    );
  });

  it("should disable credentials and submit while authenticating", () => {
    renderWithProviders(<LoginForm isSubmitting onSubmit={vi.fn()} />);

    expect(screen.getByRole("textbox", { name: /correo electr[oó]nico/i })).toBeDisabled();
    expect(screen.getByLabelText(/contrase[nñ]a/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /iniciando sesi[oó]n/i })).toBeDisabled();
  });

  it("should present the account copy in correct Spanish without the product suffix", () => {
    renderWithProviders(<LoginForm onSubmit={vi.fn()} />);

    expect(screen.getByRole("heading", { level: 1, name: "Iniciar sesión" })).toBeInTheDocument();
    expect(screen.getByLabelText("Correo electrónico")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeInTheDocument();
  });

  it("should link to password recovery from the login form", () => {
    renderWithProviders(<LoginForm onSubmit={vi.fn()} />);

    expect(screen.getByRole("link", { name: /olvid[oó] su contrase[nñ]a/i })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });
});
