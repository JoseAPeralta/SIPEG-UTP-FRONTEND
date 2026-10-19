import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

import { createAdministrativeActivityDetail } from "@/test/factories";

import type { ActivityMutationFailure } from "../adapters/activityFailure";
import { ActivityForm } from "./ActivityForm";

const NOTIFICATION_CONTROL_NAME = /notificar|avisar.*(?:asistentes|inscritos)|enviar.*correos/i;

async function expectNoNotificationControls(element: HTMLElement) {
  const scope = within(element);

  await expect(
    scope.queryByRole("checkbox", { name: NOTIFICATION_CONTROL_NAME }),
  ).not.toBeInTheDocument();
  await expect(
    scope.queryByRole("switch", { name: NOTIFICATION_CONTROL_NAME }),
  ).not.toBeInTheDocument();
  await expect(
    scope.queryByRole("radio", { name: NOTIFICATION_CONTROL_NAME }),
  ).not.toBeInTheDocument();
  await expect(
    scope.queryByRole("button", { name: NOTIFICATION_CONTROL_NAME }),
  ).not.toBeInTheDocument();
}

type ActivityFormStoryProps = {
  failure?: ActivityMutationFailure | null;
  mode?: "create" | "edit";
};

function ActivityFormStory({ failure = null, mode = "create" }: ActivityFormStoryProps) {
  const original = createAdministrativeActivityDetail();

  if (mode === "edit") {
    return (
      <ActivityForm
        failure={failure}
        isSubmitting={false}
        mode="edit"
        onCancel={() => undefined}
        onRefresh={() => undefined}
        onSubmit={() => undefined}
        original={original}
        programName="Semana de Innovacion Academica"
      />
    );
  }

  return (
    <ActivityForm
      failure={failure}
      isSubmitting={false}
      mode="create"
      onCancel={() => undefined}
      onSubmit={() => undefined}
      programId="program-innovation-week"
      programName="Semana de Innovacion Academica"
    />
  );
}

const meta = {
  component: ActivityFormStory,
  parameters: {
    docs: {
      description: {
        component:
          "Formulario unico de alta y edicion de actividades. La edicion envia solo los campos modificados y conserva los ponentes originales salvo que se editen; el selector de aula consulta disponibilidad solo a peticion. El contrato no define una decision ni un resultado de notificacion, por lo que el formulario no ofrece esos controles.",
      },
    },
  },
  tags: ["autodocs"],
  title: "Features/Activity Catalog/ActivityForm",
} satisfies Meta<typeof ActivityFormStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CreatingActivity: Story = {
  args: { mode: "create" },
  play: async ({ canvas }) => {
    const formElement = canvas.getByRole("form", { name: "Nueva actividad" });
    const form = within(formElement);

    await expectNoNotificationControls(formElement);

    await expect(form.getByRole("textbox", { name: "Nombre" })).toBeVisible();
    await expect(form.getByRole("textbox", { name: "Programa" })).toHaveValue(
      "Semana de Innovacion Academica",
    );
    await expect(form.getByRole("button", { name: "Consultar aulas" })).toBeDisabled();
  },
};

export const EditingActivity: Story = {
  args: { mode: "edit" },
  play: async ({ canvas }) => {
    const formElement = canvas.getByRole("form", { name: "Editar actividad" });
    const form = within(formElement);

    await expectNoNotificationControls(formElement);

    await expect(form.getByRole("textbox", { name: "Nombre" })).toHaveValue("Actividad de prueba");
    await expect(
      form.getByRole("option", { name: /aula 101.*asignada; se validará al guardar/i }),
    ).toBeVisible();
  },
};

export const RejectedByServer: Story = {
  args: { failure: "conflict", mode: "edit" },
  play: async ({ canvas }) => {
    const formElement = canvas.getByRole("form", { name: "Editar actividad" });
    const form = within(formElement);

    await expectNoNotificationControls(formElement);

    await expect(canvas.getByRole("alert")).toHaveTextContent(/aula pudo ser reservada/i);
    await expect(canvas.getByRole("button", { name: "Actualizar actividad" })).toBeVisible();
    await expect(form.getByRole("textbox", { name: "Nombre" })).toHaveValue("Actividad de prueba");
  },
};
