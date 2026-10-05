import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";

import { ChangePasswordForm } from "./ChangePasswordForm";

const meta = {
  args: {
    onSubmit: fn(),
  },
  component: ChangePasswordForm,
  parameters: {
    docs: {
      description: {
        component:
          "Formulario que cambia la contraseña de la sesión activa. Solo recibe la contraseña actual y la nueva: los tokens los resuelve `useChangePassword` en el store de sesión, por lo que nunca llegan al DOM ni a las props.",
      },
    },
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Features/Auth/ChangePasswordForm",
} satisfies Meta<typeof ChangePasswordForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.type(canvas.getByLabelText(/contraseña actual/i), "sipeg-demo");
    await userEvent.type(canvas.getByLabelText(/^nueva contraseña/i), "Nueva clave 2026");
    await userEvent.type(canvas.getByLabelText(/confirmar contraseña/i), "Nueva clave 2026");
    await userEvent.click(canvas.getByRole("button", { name: /cambiar contraseña/i }));

    await expect(args.onSubmit).toHaveBeenCalledWith({
      currentPassword: "sipeg-demo",
      newPassword: "Nueva clave 2026",
    });
  },
};

export const CurrentPasswordRequired: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.type(canvas.getByLabelText(/^nueva contraseña/i), "Nueva clave 2026");
    await userEvent.type(canvas.getByLabelText(/confirmar contraseña/i), "Nueva clave 2026");
    await userEvent.click(canvas.getByRole("button", { name: /cambiar contraseña/i }));

    await expect(canvas.getByText(/ingrese su contraseña actual/i)).toBeInTheDocument();
    await expect(canvas.getByLabelText(/contraseña actual/i)).toHaveFocus();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

export const PasswordTooShort: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.type(canvas.getByLabelText(/contraseña actual/i), "sipeg-demo");
    await userEvent.type(canvas.getByLabelText(/^nueva contraseña/i), "corta");
    await userEvent.type(canvas.getByLabelText(/confirmar contraseña/i), "corta");
    await userEvent.click(canvas.getByRole("button", { name: /cambiar contraseña/i }));

    await expect(canvas.getByText(/al menos 12 caracteres/i)).toBeInTheDocument();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

export const PasswordMismatch: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.type(canvas.getByLabelText(/contraseña actual/i), "sipeg-demo");
    await userEvent.type(canvas.getByLabelText(/^nueva contraseña/i), "Nueva clave 2026");
    await userEvent.type(canvas.getByLabelText(/confirmar contraseña/i), "Otra clave 2026");
    await userEvent.click(canvas.getByRole("button", { name: /cambiar contraseña/i }));

    await expect(canvas.getByText(/las contraseñas no coinciden/i)).toBeInTheDocument();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

export const PasswordVisible: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText(/contraseña actual/i), "sipeg-demo");

    await userEvent.click(canvas.getByRole("button", { name: /mostrar contraseñas/i }));

    await expect(canvas.getByLabelText(/contraseña actual/i)).toHaveAttribute("type", "text");
    await expect(canvas.getByLabelText(/^nueva contraseña/i)).toHaveAttribute("type", "text");
    await expect(canvas.getByLabelText(/confirmar contraseña/i)).toHaveAttribute("type", "text");
  },
};

export const Submitting: Story = {
  args: {
    isSubmitting: true,
  },
};

export const InvalidCredentials: Story = {
  args: {
    errorMessage: "No fue posible validar el cambio con la contraseña actual.",
  },
};

export const Throttled: Story = {
  args: {
    errorMessage: "Ha realizado demasiados intentos. Espere un momento e intente de nuevo.",
  },
};
