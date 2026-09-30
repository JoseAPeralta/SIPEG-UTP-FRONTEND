import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";

import { ResetPasswordForm } from "./ResetPasswordForm";

const meta = {
  args: {
    onSubmit: fn(),
    token: "reset-token",
  },
  component: ResetPasswordForm,
  parameters: {
    docs: {
      description: {
        component:
          "Formulario que crea una contrasena nueva para un enlace de recuperacion. Recibe el token como prop y solo lo reenvia al adapter: nunca lo renderiza ni lo guarda en el DOM.",
      },
    },
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Features/Auth/ResetPasswordForm",
} satisfies Meta<typeof ResetPasswordForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas, canvasElement }) => {
    await userEvent.type(canvas.getByLabelText(/nueva contrase[nñ]a/i), "Nueva clave 2026");
    await userEvent.type(canvas.getByLabelText(/confirmar contrase[nñ]a/i), "Nueva clave 2026");
    await userEvent.click(canvas.getByRole("button", { name: /restablecer contrase[nñ]a/i }));

    await expect(args.onSubmit).toHaveBeenCalledWith({
      newPassword: "Nueva clave 2026",
      token: "reset-token",
    });
    await expect(canvasElement).not.toHaveTextContent("reset-token");
  },
};

export const PasswordTooShort: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.type(canvas.getByLabelText(/nueva contrase[nñ]a/i), "corta");
    await userEvent.type(canvas.getByLabelText(/confirmar contrase[nñ]a/i), "corta");
    await userEvent.click(canvas.getByRole("button", { name: /restablecer contrase[nñ]a/i }));

    await expect(canvas.getByText(/al menos 12 caracteres/i)).toBeInTheDocument();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

export const PasswordMismatch: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.type(canvas.getByLabelText(/nueva contrase[nñ]a/i), "Nueva clave 2026");
    await userEvent.type(canvas.getByLabelText(/confirmar contrase[nñ]a/i), "Otra clave 2026");
    await userEvent.click(canvas.getByRole("button", { name: /restablecer contrase[nñ]a/i }));

    await expect(canvas.getByText(/las contraseñas no coinciden/i)).toBeInTheDocument();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

export const PasswordVisible: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: /mostrar contrase[nñ]as/i }));

    await expect(canvas.getByLabelText(/nueva contrase[nñ]a/i)).toHaveAttribute("type", "text");
    await expect(canvas.getByLabelText(/confirmar contrase[nñ]a/i)).toHaveAttribute("type", "text");
  },
};

export const Submitting: Story = {
  args: {
    isSubmitting: true,
  },
};

export const ExpiredLink: Story = {
  args: {
    errorMessage: "El enlace es inválido o ha expirado. Solicite un enlace nuevo para continuar.",
  },
};
