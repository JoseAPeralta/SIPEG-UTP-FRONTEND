import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";

import { createCareer, createOrganizationalUnit } from "@/test/factories";

import { RegisterForm } from "./RegisterForm";

const faculty = createOrganizationalUnit({ id: "fisc", name: "Facultad de Sistemas" });
const subdirectorate = createOrganizationalUnit({
  id: "sub-acad",
  name: "Subdireccion Academica",
  type: "SUBDIRECTORATE",
});

const meta = {
  args: {
    careers: [
      createCareer({ id: "software", name: "Ingenieria de Software", unitId: faculty.id }),
      createCareer({ code: "OTROS", id: "other", name: "Otros", unitId: null }),
    ],
    onSubmit: fn(),
    organizationalUnits: [faculty, subdirectorate],
  },
  component: RegisterForm,
  parameters: {
    docs: {
      description: {
        component:
          "Formulario publico de registro que respeta el contrato de auth/register y relaciona facultades con carreras.",
      },
    },
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Features/Registration/RegisterForm",
} satisfies Meta<typeof RegisterForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const career = canvas.getByRole("combobox", { name: /carrera/i });
    await expect(career).toBeDisabled();
    await userEvent.selectOptions(
      canvas.getByRole("combobox", { name: /unidad \/ facultad/i }),
      faculty.id,
    );
    await expect(career).toBeEnabled();
    await userEvent.click(canvas.getByRole("button", { name: /mostrar contrase[nñ]a/i }));
    await expect(canvas.getByLabelText(/^contrase[nñ]a$/i)).toHaveAttribute("type", "text");
  },
};

export const Submitting: Story = {
  args: { isSubmitting: true },
};

export const RegistrationError: Story = {
  args: { errorMessage: "No se pudo completar el registro. Intente de nuevo." },
};
