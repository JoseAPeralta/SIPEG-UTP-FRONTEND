import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";

import { ClassroomDetailView } from "./ClassroomDetailView";

const meta = {
  component: ClassroomDetailView,
  args: { classroomId: "aula-10" },
  parameters: {
    docs: {
      description: {
        component:
          "Detalle administrativo de un aula: datos, amenidades y disponibilidad semanal. El estado no tiene comando propio, desactivar y reactivar son el `PATCH` de `isActive` porque el contrato no publica un borrado de aulas.",
      },
    },
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  title: "Features/Classrooms/ClassroomDetailView",
} satisfies Meta<typeof ClassroomDetailView>;

export default meta;
type Story = StoryObj<typeof meta>;

function authenticateAdministrator() {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole: "ADMIN" }),
    tokens: createAuthTokens(),
  });
}

export const Default: Story = {
  beforeEach: authenticateAdministrator,
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("heading", { level: 1, name: "Aula 10B" })).toBeVisible();

    const availability = within(canvas.getByRole("region", { name: /disponibilidad semanal/i }));
    await expect(availability.getByRole("region", { name: "Lunes" })).toBeVisible();
    await expect(availability.getByRole("region", { name: "Jueves" })).toBeVisible();
    await expect(availability.queryByRole("region", { name: "Domingo" })).toBeNull();
  },
};

export const AddingAWeeklyWindow: Story = {
  beforeEach: authenticateAdministrator,
  parameters: {
    docs: {
      description: {
        story:
          "El dia elegido en el formulario decide en que grupo aparece la ventana. El mock ya tiene un bloque el viernes de 09:00 a 13:00, asi que la nueva ventana es contigua y no solapa.",
      },
    },
  },
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByRole("heading", { level: 1, name: "Aula 10B" })).toBeVisible();

    await userEvent.selectOptions(canvas.getByRole("combobox", { name: "Dia" }), "5");
    await userEvent.type(canvas.getByRole("textbox", { name: "Hora de inicio" }), "14:00");
    await userEvent.type(canvas.getByRole("textbox", { name: "Hora de fin" }), "16:00");
    await userEvent.type(canvas.getByRole("textbox", { name: "Periodo" }), "Tarde");
    await userEvent.click(canvas.getByRole("button", { name: "Agregar ventana" }));

    const friday = await canvas.findByRole("region", { name: "Viernes" });
    await expect(within(friday).getByText(/14:00 a 16:00/)).toBeVisible();

    const monday = canvas.getByRole("region", { name: "Lunes" });
    await expect(within(monday).queryByText(/14:00 a 16:00/)).toBeNull();
  },
};

export const UnknownClassroom: Story = {
  args: { classroomId: "aula-inexistente" },
  beforeEach: authenticateAdministrator,
  parameters: {
    docs: {
      description: {
        story:
          "Un identificador que el backend no reconoce produce un estado vacio con salida, no un error reintentable.",
      },
    },
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(/el aula solicitada ya no existe o fue retirada/i),
    ).toBeVisible();
    await expect(canvas.getByRole("link", { name: /volver al listado de aulas/i })).toHaveAttribute(
      "href",
      "/admin/aulas",
    );
  },
};
