import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { ActivityStoryProviders } from "@/test/ActivityStoryProviders";

import { ActivityLifecycleConfirmation } from "./ActivityLifecycleConfirmation";

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

const meta = {
  args: {
    activityName: "Gobernanza de datos abiertos universitarios",
    failure: null,
    isSubmitting: false,
    onConfirm: fn(),
    onDiscard: fn(),
  },
  argTypes: {
    onConfirm: { control: false },
    onDiscard: { control: false },
    onRefresh: { control: false },
  },
  component: ActivityLifecycleConfirmation,
  decorators: [
    (Story, context) => (
      <ActivityStoryProviders key={context.id}>
        <Story />
      </ActivityStoryProviders>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "Confirmacion presentacional de una transicion de ciclo de vida. El motivo de cancelacion vive en el componente: un rechazo o una relectura conservan lo escrito. El contrato no define una decision ni un resultado de notificacion, por lo que la confirmacion solo expone la accion de estado.",
      },
    },
  },
  tags: ["autodocs"],
  title: "Features/Activity Catalog/ActivityLifecycleConfirmation",
} satisfies Meta<typeof ActivityLifecycleConfirmation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ConfirmingPublication: Story = {
  args: { action: "publish" },
  play: async ({ canvas }) => {
    const formElement = canvas.getByRole("form", { name: /publicar actividad/i });
    const form = within(formElement);

    await expectNoNotificationControls(formElement);

    await expect(form.getByText(/quedará disponible en la agenda pública/i)).toBeVisible();
    await expect(form.getByRole("button", { name: "Confirmar publicación" })).toBeVisible();
  },
};

export const ConfirmingUnpublication: Story = {
  args: { action: "unpublish" },
  play: async ({ canvas }) => {
    const formElement = canvas.getByRole("form", { name: /despublicar actividad/i });
    const form = within(formElement);

    await expectNoNotificationControls(formElement);

    await expect(form.getByText(/volverá a borrador/i)).toBeVisible();
    await expect(form.getByRole("button", { name: "Confirmar despublicación" })).toBeVisible();
  },
};

export const CancellingWithReason: Story = {
  args: { action: "cancel" },
  play: async ({ args, canvas, userEvent }) => {
    const formElement = canvas.getByRole("form", { name: /cancelar actividad/i });
    const form = within(formElement);
    const reason = form.getByRole("textbox", { name: "Motivo de cancelación — opcional" });

    await expectNoNotificationControls(formElement);

    reason.focus();
    await expect(reason).toHaveFocus();
    await userEvent.type(reason, "  Lluvia intensa  ");

    const confirm = form.getByRole("button", { name: "Confirmar cancelación" });
    confirm.focus();
    await expect(confirm).toHaveFocus();
    await userEvent.keyboard("{Enter}");

    await expect(args.onConfirm).toHaveBeenCalledWith({ reason: "Lluvia intensa" });
  },
};

export const CancellingWithoutReason: Story = {
  args: { action: "cancel" },
  play: async ({ args, canvas }) => {
    await expectNoNotificationControls(canvas.getByRole("form", { name: /cancelar actividad/i }));

    await userEvent.click(canvas.getByRole("button", { name: "Confirmar cancelación" }));

    await expect(args.onConfirm).toHaveBeenCalledWith({});
  },
};

export const OverLimitReason: Story = {
  args: { action: "cancel" },
  play: async ({ args, canvas }) => {
    const formElement = canvas.getByRole("form", { name: /cancelar actividad/i });
    const reason = canvas.getByRole("textbox", {
      name: "Motivo de cancelación — opcional",
    });

    await expectNoNotificationControls(formElement);

    await userEvent.type(reason, "a".repeat(501));
    await userEvent.click(canvas.getByRole("button", { name: "Confirmar cancelación" }));

    await expect(args.onConfirm).not.toHaveBeenCalled();
    await expect(canvas.getByText(/500 caracteres/i)).toBeVisible();
  },
};

export const ConflictRecovery: Story = {
  args: { action: "cancel", failure: "conflict", onRefresh: fn() },
  play: async ({ args, canvas }) => {
    await expectNoNotificationControls(canvas.getByRole("form", { name: /cancelar actividad/i }));

    await expect(canvas.getByRole("alert")).toHaveTextContent(/programa dejó de estar activo/i);
    await userEvent.click(canvas.getByRole("button", { name: "Actualizar actividad" }));

    await expect(args.onRefresh).toHaveBeenCalledTimes(1);
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
};

export const DeletingDraft: Story = {
  args: { action: "delete" },
  play: async ({ args, canvas }) => {
    const formElement = canvas.getByRole("form", { name: /eliminar borrador/i });
    const form = within(formElement);

    await expectNoNotificationControls(formElement);

    await expect(form.getByText(/se eliminará de forma permanente/i)).toBeVisible();
    await expect(form.getByText(/el servidor verificará esta condición/i)).toBeVisible();

    await userEvent.click(form.getByRole("button", { name: "Eliminar borrador" }));
    await expect(args.onConfirm).toHaveBeenCalledWith({});

    await userEvent.click(form.getByRole("button", { name: "Volver sin cambios" }));
    await expect(args.onDiscard).toHaveBeenCalledTimes(1);
  },
};

export const DeletionRejectedByHistory: Story = {
  args: { action: "delete", failure: "conflict", onRefresh: fn() },
  play: async ({ args, canvas }) => {
    await expectNoNotificationControls(canvas.getByRole("form", { name: /eliminar borrador/i }));

    await expect(canvas.getByRole("alert")).toHaveTextContent(
      /registros de asistencia o alertas que deben conservarse/i,
    );
    await userEvent.click(canvas.getByRole("button", { name: "Actualizar actividad" }));

    await expect(args.onRefresh).toHaveBeenCalledTimes(1);
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
};

export const DeletionNotAllowed: Story = {
  args: { action: "delete", isAllowed: false, onRefresh: fn() },
  play: async ({ canvas }) => {
    await expectNoNotificationControls(canvas.getByRole("form", { name: /eliminar borrador/i }));

    await expect(canvas.getByRole("button", { name: "Eliminar borrador" })).toBeDisabled();
    await expect(canvas.getByText(/ya no está disponible/i)).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Actualizar actividad" })).toBeVisible();
  },
};

export const NotAllowed: Story = {
  args: { action: "cancel", isAllowed: false },
  play: async ({ canvas }) => {
    await expectNoNotificationControls(canvas.getByRole("form", { name: /cancelar actividad/i }));

    await expect(canvas.getByRole("button", { name: "Confirmar cancelación" })).toBeDisabled();
    await expect(canvas.getByText(/ya no está disponible/i)).toBeVisible();
  },
};

export const Submitting: Story = {
  args: { action: "publish", isSubmitting: true },
  play: async ({ canvas }) => {
    await expectNoNotificationControls(canvas.getByRole("form", { name: /publicar actividad/i }));

    await expect(canvas.getByRole("button", { name: "Confirmando..." })).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "Volver sin cambios" })).toBeDisabled();
  },
};
