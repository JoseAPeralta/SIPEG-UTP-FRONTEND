import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";

import { LoginForm } from "./LoginForm";

const meta = {
  args: {
    onSubmit: fn(),
  },
  component: LoginForm,
  parameters: {
    docs: {
      description: {
        component:
          "Formulario de acceso administrativo conectado por la pagina al adapter de autenticacion.",
      },
    },
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Features/Auth/LoginForm",
} satisfies Meta<typeof LoginForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.type(
      canvas.getByRole("textbox", { name: /correo electronico/i }),
      "admin@example.edu",
    );
    await userEvent.type(canvas.getByLabelText(/contrasena/i), "secret");
    await userEvent.click(canvas.getByRole("button", { name: /iniciar sesion/i }));

    await expect(args.onSubmit).toHaveBeenCalledWith({
      email: "admin@example.edu",
      password: "secret",
    });
  },
};

export const AuthenticationError: Story = {
  args: {
    errorMessage: "El correo o la contrasena no son correctos.",
  },
};

export const Submitting: Story = {
  args: {
    isSubmitting: true,
  },
};
