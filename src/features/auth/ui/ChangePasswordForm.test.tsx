import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";

import { ChangePasswordForm } from "./ChangePasswordForm";

const request = { currentPassword: "sipeg-demo", newPassword: "Nueva clave 2026" };

async function submitChange(
  user: ReturnType<typeof userEvent.setup>,
  { currentPassword = "sipeg-demo", newPassword = "Nueva clave 2026" } = {},
) {
  if (currentPassword) {
    await user.type(screen.getByLabelText(/contraseña actual/i), currentPassword);
  }

  await user.type(screen.getByLabelText(/^nueva contraseña/i), newPassword);
  await user.type(screen.getByLabelText(/confirmar contraseña/i), newPassword);
  await user.click(screen.getByRole("button", { name: /cambiar contraseña/i }));
}

describe("ChangePasswordForm", () => {
  it("should submit only the current and the new password", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<ChangePasswordForm onSubmit={onSubmit} />);

    await submitChange(user);

    expect(onSubmit).toHaveBeenCalledWith(request);
    expect(Object.keys(onSubmit.mock.calls[0]?.[0] as object)).toEqual([
      "currentPassword",
      "newPassword",
    ]);
  });

  it("should mark the fields with the managed autocomplete tokens", () => {
    renderWithProviders(<ChangePasswordForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/contraseña actual/i)).toHaveAttribute(
      "autoComplete",
      "current-password",
    );
    expect(screen.getByLabelText(/^nueva contraseña/i)).toHaveAttribute(
      "autoComplete",
      "new-password",
    );
    expect(screen.getByLabelText(/confirmar contraseña/i)).toHaveAttribute(
      "autoComplete",
      "new-password",
    );
  });

  it("should require the current password and focus it", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(<ChangePasswordForm onSubmit={onSubmit} />);

    await submitChange(user, { currentPassword: "" });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/ingrese su contraseña actual/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña actual/i)).toHaveFocus();
  });

  it("should reject a new password shorter than the minimum", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(<ChangePasswordForm onSubmit={onSubmit} />);

    await submitChange(user, { newPassword: "corta" });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/al menos 12 caracteres/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^nueva contraseña/i)).toHaveFocus();
  });

  it("should reject a confirmation that does not match", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(<ChangePasswordForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/contraseña actual/i), "sipeg-demo");
    await user.type(screen.getByLabelText(/^nueva contraseña/i), "Nueva clave 2026");
    await user.type(screen.getByLabelText(/confirmar contraseña/i), "Otra clave 2026");
    await user.click(screen.getByRole("button", { name: /cambiar contraseña/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/las contraseñas no coinciden/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar contraseña/i)).toHaveFocus();
  });

  it("should announce the service error and preserve the typed credentials", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ChangePasswordForm
        errorMessage="No fue posible validar el cambio con la contraseña actual."
        onSubmit={vi.fn()}
      />,
    );

    await submitChange(user);

    expect(screen.getByRole("alert")).toHaveTextContent(/contraseña actual/i);
    expect(screen.getByLabelText(/contraseña actual/i)).toHaveValue("sipeg-demo");
    expect(screen.getByLabelText(/^nueva contraseña/i)).toHaveValue("Nueva clave 2026");
  });

  it("should toggle the visibility of every password", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChangePasswordForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/contraseña actual/i)).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: /mostrar contraseñas/i }));

    expect(screen.getByLabelText(/contraseña actual/i)).toHaveAttribute("type", "text");
    expect(screen.getByLabelText(/^nueva contraseña/i)).toHaveAttribute("type", "text");
    expect(screen.getByLabelText(/confirmar contraseña/i)).toHaveAttribute("type", "text");
  });

  it("should disable every control while submitting", () => {
    renderWithProviders(<ChangePasswordForm isSubmitting onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/contraseña actual/i)).toBeDisabled();
    expect(screen.getByLabelText(/^nueva contraseña/i)).toBeDisabled();
    expect(screen.getByLabelText(/confirmar contraseña/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /cambiando/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /mostrar contraseñas/i })).toBeDisabled();
  });

  it("should not send the request twice while submitting", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(() => new Promise<void>(() => undefined));
    renderWithProviders(<ChangePasswordForm isSubmitting onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: /cambiando/i }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
