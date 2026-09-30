import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";

import { ForgotPasswordForm } from "./ForgotPasswordForm";

const meta = {
  args: {
    onSubmit: fn(),
  },
  component: ForgotPasswordForm,
  parameters: {
    docs: {
      description: {
        component:
          "Formulario publico que solicita el enlace de recuperacion. La pagina decide el texto de confirmacion, de modo que la misma respuesta se muestra para direcciones conocidas y desconocidas.",
      },
    },
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Features/Auth/ForgotPasswordForm",
} satisfies Meta<typeof ForgotPasswordForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.type(
      canvas.getByRole("textbox", { name: /correo electr[oó]nico/i }),
      " persona@example.edu ",
    );
    await userEvent.click(canvas.getByRole("button", { name: /enviar enlace/i }));

    await expect(args.onSubmit).toHaveBeenCalledWith({ email: "persona@example.edu" });
  },
};

export const InvalidEmail: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.type(
      canvas.getByRole("textbox", { name: /correo electr[oó]nico/i }),
      "persona",
    );
    await userEvent.click(canvas.getByRole("button", { name: /enviar enlace/i }));

    await expect(
      canvas.getByText(/ingrese un correo electr[oó]nico v[aá]lido/i),
    ).toBeInTheDocument();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

export const Submitting: Story = {
  args: {
    isSubmitting: true,
  },
};

export const ServiceError: Story = {
  args: {
    errorMessage: "Ha enviado demasiadas solicitudes. Espere un momento e intente de nuevo.",
  },
};
