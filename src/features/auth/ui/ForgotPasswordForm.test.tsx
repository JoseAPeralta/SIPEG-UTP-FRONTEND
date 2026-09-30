import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";

import { ForgotPasswordForm } from "./ForgotPasswordForm";

describe("ForgotPasswordForm", () => {
  it("should submit a trimmed email", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<ForgotPasswordForm onSubmit={onSubmit} />);

    await user.type(
      screen.getByRole("textbox", { name: /correo electr[oó]nico/i }),
      " persona@example.edu ",
    );
    await user.click(screen.getByRole("button", { name: /enviar enlace/i }));

    expect(onSubmit).toHaveBeenCalledWith({ email: "persona@example.edu" });
  });

  it("should keep the email and focus the field when the email is malformed", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(<ForgotPasswordForm onSubmit={onSubmit} />);

    await user.type(screen.getByRole("textbox", { name: /correo electr[oó]nico/i }), "persona");
    await user.click(screen.getByRole("button", { name: /enviar enlace/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/ingrese un correo electr[oó]nico v[aá]lido/i)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /correo electr[oó]nico/i })).toHaveFocus();
    expect(screen.getByRole("textbox", { name: /correo electr[oó]nico/i })).toHaveValue("persona");
  });

  it("should clear the local error once the email changes", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordForm onSubmit={vi.fn()} />);

    const field = screen.getByRole("textbox", { name: /correo electr[oó]nico/i });
    await user.type(field, "persona");
    await user.click(screen.getByRole("button", { name: /enviar enlace/i }));
    await user.type(field, "@example.edu");

    expect(
      screen.queryByText(/ingrese un correo electr[oó]nico v[aá]lido/i),
    ).not.toBeInTheDocument();
  });

  it("should announce the service error and preserve the typed email", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ForgotPasswordForm
        errorMessage="Ha enviado demasiadas solicitudes. Espere un momento e intente de nuevo."
        onSubmit={vi.fn()}
      />,
    );

    await user.type(
      screen.getByRole("textbox", { name: /correo electr[oó]nico/i }),
      "persona@example.edu",
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/demasiadas solicitudes/i);
    expect(screen.getByRole("textbox", { name: /correo electr[oó]nico/i })).toHaveValue(
      "persona@example.edu",
    );
  });

  it("should disable the field and the button while submitting", () => {
    renderWithProviders(<ForgotPasswordForm isSubmitting onSubmit={vi.fn()} />);

    expect(screen.getByRole("textbox", { name: /correo electr[oó]nico/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /enviando enlace/i })).toBeDisabled();
  });

  it("should link back to the login destination", () => {
    renderWithProviders(<ForgotPasswordForm onSubmit={vi.fn()} />);

    expect(screen.getByRole("link", { name: /volver a iniciar sesi[oó]n/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});
