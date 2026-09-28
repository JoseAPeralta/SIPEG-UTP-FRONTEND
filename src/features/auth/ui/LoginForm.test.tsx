import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";

import { LoginForm } from "./LoginForm";

describe("LoginForm", () => {
  it("should submit trimmed credentials", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<LoginForm onSubmit={onSubmit} />);

    expect(
      screen.getByText(/use las credenciales de su cuenta institucional/i),
    ).toBeInTheDocument();

    await user.type(
      screen.getByRole("textbox", { name: /correo electronico/i }),
      " admin@example.edu ",
    );
    await user.type(screen.getByLabelText(/contrasena/i), "secret");
    await user.click(screen.getByRole("button", { name: /iniciar sesion/i }));

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

    expect(screen.getByRole("textbox", { name: /correo electronico/i })).toBeDisabled();
    expect(screen.getByLabelText(/contrasena/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /iniciando sesion/i })).toBeDisabled();
  });
});
