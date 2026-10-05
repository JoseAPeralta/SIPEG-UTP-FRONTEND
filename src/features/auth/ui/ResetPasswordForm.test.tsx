import { screen } from "@testing-library/react";
import { setupUser } from "@/test/user";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";

import { ResetPasswordForm } from "./ResetPasswordForm";

describe("ResetPasswordForm", () => {
  it("should submit the token and the new password without the confirmation", async () => {
    const user = setupUser();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<ResetPasswordForm onSubmit={onSubmit} token="reset-token" />);

    await user.type(screen.getByLabelText(/nueva contrase[nñ]a/i), "Nueva clave 2026");
    await user.type(screen.getByLabelText(/confirmar contrase[nñ]a/i), "Nueva clave 2026");
    await user.click(screen.getByRole("button", { name: /restablecer/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      newPassword: "Nueva clave 2026",
      token: "reset-token",
    });
  });

  it("should require at least 12 characters", async () => {
    const user = setupUser();
    const onSubmit = vi.fn();
    renderWithProviders(<ResetPasswordForm onSubmit={onSubmit} token="reset-token" />);

    await user.type(screen.getByLabelText(/nueva contrase[nñ]a/i), "corta");
    await user.type(screen.getByLabelText(/confirmar contrase[nñ]a/i), "corta");
    await user.click(screen.getByRole("button", { name: /restablecer/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/al menos 12 caracteres/i)).toBeInTheDocument();
  });

  it("should cap the new password at 20 characters", async () => {
    const user = setupUser();
    const onSubmit = vi.fn();
    renderWithProviders(<ResetPasswordForm onSubmit={onSubmit} token="reset-token" />);

    const field = screen.getByLabelText(/nueva contrase[nñ]a/i);
    await user.type(field, "a".repeat(25));

    expect(field).toHaveAttribute("maxlength", "20");
    expect(field).toHaveValue("a".repeat(20));
  });

  it("should reject a confirmation that does not match", async () => {
    const user = setupUser();
    const onSubmit = vi.fn();
    renderWithProviders(<ResetPasswordForm onSubmit={onSubmit} token="reset-token" />);

    await user.type(screen.getByLabelText(/nueva contrase[nñ]a/i), "Nueva clave 2026");
    await user.type(screen.getByLabelText(/confirmar contrase[nñ]a/i), "Otra clave 2026");
    await user.click(screen.getByRole("button", { name: /restablecer/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/las contraseñas no coinciden/i)).toBeInTheDocument();
  });

  it("should never render the token", () => {
    renderWithProviders(<ResetPasswordForm onSubmit={vi.fn()} token="reset-token-secreto" />);

    expect(document.body.innerHTML).not.toContain("reset-token-secreto");
  });

  it("should toggle password visibility for both fields", async () => {
    const user = setupUser();
    renderWithProviders(<ResetPasswordForm onSubmit={vi.fn()} token="reset-token" />);

    const newPasswordField = screen.getByLabelText(/nueva contrase[nñ]a/i);
    const confirmPasswordField = screen.getByLabelText(/confirmar contrase[nñ]a/i);
    await user.click(screen.getByRole("button", { name: /mostrar contrase[nñ]as/i }));

    expect(newPasswordField).toHaveAttribute("type", "text");
    expect(confirmPasswordField).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: /ocultar contrase[nñ]as/i }));

    expect(newPasswordField).toHaveAttribute("type", "password");
    expect(confirmPasswordField).toHaveAttribute("type", "password");
  });

  it("should announce the service error and preserve the typed password", async () => {
    const user = setupUser();
    renderWithProviders(
      <ResetPasswordForm
        errorMessage="El enlace es inválido o ha expirado. Solicite uno nuevo."
        onSubmit={vi.fn()}
        token="reset-token"
      />,
    );

    await user.type(screen.getByLabelText(/nueva contrase[nñ]a/i), "Nueva clave 2026");

    expect(screen.getByRole("alert")).toHaveTextContent(/inv[aá]lido o ha expirado/i);
    expect(screen.getByLabelText(/nueva contrase[nñ]a/i)).toHaveValue("Nueva clave 2026");
  });

  it("should disable both fields and the button while submitting", () => {
    renderWithProviders(<ResetPasswordForm isSubmitting onSubmit={vi.fn()} token="reset-token" />);

    expect(screen.getByLabelText(/nueva contrase[nñ]a/i)).toBeDisabled();
    expect(screen.getByLabelText(/confirmar contrase[nñ]a/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /restableciendo/i })).toBeDisabled();
  });
});
