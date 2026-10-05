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
          "Formulario de acceso a la cuenta conectado por la pagina al adapter de autenticacion. El destino posterior depende del rol global del perfil.",
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
    await expect(canvas.getByText(/acceso a su cuenta/i)).toBeVisible();
    await expect(canvas.queryByText(/acceso administrativo/i)).toBeNull();
    await expect(canvas.getByRole("link", { name: /olvid[oó] su contrase[nñ]a/i })).toHaveAttribute(
      "href",
      "/forgot-password",
    );

    await userEvent.type(
      canvas.getByRole("textbox", { name: /correo electr[oó]nico/i }),
      "admin@example.edu",
    );
    await userEvent.type(canvas.getByLabelText(/contrase[nñ]a/i), "secret");
    await userEvent.click(canvas.getByRole("button", { name: /iniciar sesi[oó]n/i }));

    await expect(args.onSubmit).toHaveBeenCalledWith({
      email: "admin@example.edu",
      password: "secret",
    });
  },
};

export const AuthenticationError: Story = {
  args: {
    errorMessage:
      "No fue posible iniciar sesion. Verifique sus datos de acceso e intente de nuevo.",
  },
};

export const Throttled: Story = {
  args: {
    errorMessage: "Ha realizado demasiados intentos. Espere un momento e intente de nuevo.",
  },
};

export const Submitting: Story = {
  args: {
    isSubmitting: true,
  },
};
