import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";

import type { AuthenticatedUser, Career, OrganizationalUnit } from "@/types/domain";

import { ProfileForm } from "./ProfileForm";

const profile: AuthenticatedUser = {
  career: { code: "SOFTWARE", id: "software", name: "Desarrollo de Software" },
  email: "mariana.rodriguez@example.edu",
  firstName: "Mariana",
  globalRole: "ADMIN",
  id: "user-1",
  identificationNumber: "8-000-0001",
  lastName: "Rodriguez",
  unit: { code: "FISC", id: "fisc", name: "Facultad de Ingenieria de Sistemas Computacionales" },
};

const organizationalUnits: OrganizationalUnit[] = [
  {
    code: "FIC",
    description: "Obras publicas e infraestructura.",
    head: null,
    id: "fic",
    isActive: true,
    name: "Facultad de Ingenieria Civil",
    type: "FACULTY",
  },
  {
    code: "FISC",
    description: "Sistemas, software y ciberseguridad.",
    head: null,
    id: "fisc",
    isActive: true,
    name: "Facultad de Ingenieria de Sistemas Computacionales",
    type: "FACULTY",
  },
  {
    code: "FIM",
    description: "Manufactura y mantenimiento.",
    head: null,
    id: "fim",
    isActive: false,
    name: "Facultad de Ingenieria Mecanica",
    type: "FACULTY",
  },
];

const careers: Career[] = [
  { code: "CIVIL", id: "civil", name: "Ingenieria Civil", unitId: "fic" },
  { code: "SOFTWARE", id: "software", name: "Desarrollo de Software", unitId: "fisc" },
  { code: "CYBER", id: "cybersecurity", name: "Ciberseguridad", unitId: "fisc" },
  { code: "MECHANICAL", id: "mechanical", name: "Ingenieria Mecanica", unitId: "fim" },
  { code: "OTROS", id: "otros", name: "Otros", unitId: null },
];

const meta = {
  args: {
    careers,
    onSubmit: fn(),
    organizationalUnits,
    profile,
  },
  component: ProfileForm,
  parameters: {
    docs: {
      description: {
        component:
          "Formulario que mantiene los datos editables del perfil propio. Solo produce `firstName`, `lastName`, `unitId` y `careerId`; el correo, la cédula y el rol se muestran como texto de solo lectura y nunca se envían.",
      },
    },
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Features/Auth/ProfileForm",
} satisfies Meta<typeof ProfileForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas }) => {
    await expect(canvas.getByLabelText(/nombre/i)).toHaveValue("Mariana");
    await expect(canvas.getByRole("button", { name: /guardar cambios/i })).toBeDisabled();

    await userEvent.clear(canvas.getByLabelText(/nombre/i));
    await userEvent.type(canvas.getByLabelText(/nombre/i), "Mariana Paula");
    await userEvent.click(canvas.getByRole("button", { name: /guardar cambios/i }));

    await expect(args.onSubmit).toHaveBeenCalledWith({ firstName: "Mariana Paula" });
  },
};

export const OtherUnit: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.selectOptions(canvas.getByLabelText(/unidad/i), "");

    const career = canvas.getByLabelText(/carrera/i);
    await expect(career).toBeDisabled();
    await expect(career).toHaveTextContent("Otros");

    await userEvent.click(canvas.getByRole("button", { name: /guardar cambios/i }));

    await expect(args.onSubmit).toHaveBeenCalledWith({ unitId: null });
  },
};

export const ValidationError: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.clear(canvas.getByLabelText(/nombre/i));
    await userEvent.type(canvas.getByLabelText(/nombre/i), "M");
    await userEvent.click(canvas.getByRole("button", { name: /guardar cambios/i }));

    await expect(canvas.getByText(/al menos 2 caracteres/i)).toBeVisible();
    await expect(canvas.getByLabelText(/nombre/i)).toHaveFocus();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

export const ServiceError: Story = {
  args: {
    errorMessage: "No fue posible guardar su perfil. Intente de nuevo en unos minutos.",
  },
};

export const Submitting: Story = {
  args: {
    isSubmitting: true,
  },
};

export const InactiveCurrentAssignment: Story = {
  args: {
    profile: {
      ...profile,
      career: { code: "MECHANICAL", id: "mechanical", name: "Ingenieria Mecanica" },
      unit: {
        code: "FIM",
        id: "fim",
        name: "Facultad de Ingenieria Mecanica",
      },
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText(/unidad/i)).toHaveValue("fim");
    await expect(canvas.getByLabelText(/carrera/i)).toHaveValue("mechanical");
  },
};
