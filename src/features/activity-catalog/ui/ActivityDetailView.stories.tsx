import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

import type { AppAdapters } from "@/app/adapters";
import type { UserScopePermission } from "@/features/collaboration";
import { useSessionStore } from "@/store/session";
import { ActivityStoryProviders } from "@/test/ActivityStoryProviders";
import {
  createAdministrativeActivityDetail,
  createAuthenticatedUser,
  createAuthTokens,
  createEventProgramListItem,
  createUserScope,
} from "@/test/factories";

import { ActivityDetailView } from "./ActivityDetailView";

const NOTIFICATION_CONTROL_NAME = /notificar|avisar.*(?:asistentes|inscritos)|enviar.*correos/i;

function expectNoNotificationControls(element: HTMLElement) {
  const scope = within(element);
  const notificationRoles = ["checkbox", "switch", "radio", "button"] as const;

  for (const role of notificationRoles) {
    if (scope.queryByRole(role, { name: NOTIFICATION_CONTROL_NAME })) {
      throw new Error(`La vista no debe ofrecer un control de notificacion (${role}).`);
    }
  }
}

type ActivityDetailStoryProps = {
  activityId: string;
  mode: "administration" | "operational";
};

function ActivityDetailStory({ activityId, mode }: ActivityDetailStoryProps) {
  return <ActivityDetailView activityId={activityId} mode={mode} />;
}

type ActivityStoryParameters = {
  activityStory?: { configure?: (adapters: AppAdapters) => void };
};

const meta = {
  args: {
    activityId: "activity-open-data-governance",
    mode: "administration",
  },
  component: ActivityDetailStory,
  decorators: [
    (Story, context) => {
      const configure = (context.parameters as ActivityStoryParameters).activityStory?.configure;

      return (
        <ActivityStoryProviders configure={configure} key={context.id}>
          <Story />
        </ActivityStoryProviders>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        component:
          "Detalle administrativo de una actividad con su edicion y su ciclo de vida en linea. El contrato no define una decision ni un resultado de notificacion, por lo que la vista no ofrece esos controles ni anuncia envios de correo.",
      },
    },
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  title: "Features/Activity Catalog/ActivityDetailView",
} satisfies Meta<typeof ActivityDetailStory>;

export default meta;
type Story = StoryObj<typeof meta>;

function authenticateAdministrator() {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole: "ADMIN" }),
    tokens: createAuthTokens(),
  });
}

function authenticateCollaborator() {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole: "USER", id: "user-1" }),
    tokens: createAuthTokens(),
  });
}

function permission(name: string): UserScopePermission {
  return { name, origin: "LOCAL", validFrom: null, validUntil: null };
}

const CANCELLED_ACTIVITY = createAdministrativeActivityDetail({
  cancelReason: "Lluvia intensa en el campus",
  id: "activity-cancelled-story",
  name: "Actividad cancelada de prueba",
  status: "CANCELLED",
});

const DELETABLE_ACTIVITY = createAdministrativeActivityDetail({
  id: "activity-deletable-draft",
  name: "Borrador listo para eliminar",
  status: "DRAFT",
});

let concurrentActivity = DELETABLE_ACTIVITY;

function draftProgram(status: "ACTIVE" | "ARCHIVED") {
  return createEventProgramListItem({
    id: DELETABLE_ACTIVITY.eventProgram.id,
    name: DELETABLE_ACTIVITY.eventProgram.name,
    status,
  });
}

function configureDraftActivity(
  adapters: AppAdapters,
  programStatus: "ACTIVE" | "ARCHIVED" = "ACTIVE",
) {
  adapters.activities = {
    ...adapters.activities,
    getActivity: () => Promise.resolve(DELETABLE_ACTIVITY),
  };
  adapters.eventPrograms = {
    ...adapters.eventPrograms,
    loadEventPrograms: () => Promise.resolve([draftProgram(programStatus)]),
  };
}

const FLOW_ACTIVITY = createAdministrativeActivityDetail({
  classroom: null,
  id: "activity-lifecycle-flow",
  name: "Gobernanza de datos abiertos universitarios",
  status: "SCHEDULED",
});

let lifecycleFlowActivity = FLOW_ACTIVITY;

function configureLifecycleFlow(adapters: AppAdapters) {
  lifecycleFlowActivity = FLOW_ACTIVITY;
  adapters.activities = {
    ...adapters.activities,
    getActivity: () => Promise.resolve(lifecycleFlowActivity),
    updateActivity: (_activityId, request) => {
      lifecycleFlowActivity = {
        ...lifecycleFlowActivity,
        status: request.status ?? lifecycleFlowActivity.status,
      };

      return Promise.resolve(lifecycleFlowActivity);
    },
    cancelActivity: (_activityId, request) => {
      lifecycleFlowActivity = {
        ...lifecycleFlowActivity,
        cancelReason: request.reason ?? null,
        status: "CANCELLED",
      };

      return Promise.resolve(lifecycleFlowActivity);
    },
  };
  adapters.eventPrograms = {
    ...adapters.eventPrograms,
    loadEventPrograms: () =>
      Promise.resolve([
        createEventProgramListItem({
          id: FLOW_ACTIVITY.eventProgram.id,
          name: FLOW_ACTIVITY.eventProgram.name,
          status: "ACTIVE",
        }),
      ]),
  };
}

export const Default: Story = {
  beforeEach: authenticateAdministrator,
  play: async ({ canvas, canvasElement }) => {
    await expect(
      await canvas.findByRole("heading", {
        level: 1,
        name: "Gobernanza de datos abiertos universitarios",
      }),
    ).toBeVisible();
    expectNoNotificationControls(canvasElement);
    await expect(canvas.getByText("Auditorio Roberto Barraza, Edificio de Aulas")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Editar actividad" })).toBeVisible();
  },
};

export const EditingActivity: Story = {
  beforeEach: authenticateAdministrator,
  parameters: {
    docs: {
      description: {
        story:
          "La edicion precarga los campos del detalle, conserva el aula asignada y solo envia lo modificado.",
      },
    },
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await canvas.findByRole("button", { name: "Editar actividad" });
    expectNoNotificationControls(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: "Editar actividad" }));
    const formElement = canvas.getByRole("form", { name: "Editar actividad" });
    const form = within(formElement);
    expectNoNotificationControls(formElement);
    await expect(form.getByRole("textbox", { name: "Nombre" })).toHaveValue(
      "Gobernanza de datos abiertos universitarios",
    );
    await userEvent.clear(form.getByRole("textbox", { name: "Descripción" }));
    await userEvent.type(form.getByRole("textbox", { name: "Descripción" }), "Descripcion nueva");
    await userEvent.click(form.getByRole("button", { name: "Guardar cambios" }));

    await expect(await canvas.findByText(/se guardaron/i)).toBeVisible();
    expectNoNotificationControls(canvasElement);
  },
};

export const ReadOnlyCompleted: Story = {
  args: { activityId: "activity-technical-writing-completed" },
  beforeEach: authenticateAdministrator,
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText("Solo lectura")).toBeVisible();
    expectNoNotificationControls(canvasElement);
    if (canvas.queryByRole("button", { name: "Editar actividad" })) {
      throw new Error("Una actividad completada no debe ofrecer edicion.");
    }
  },
};

export const OngoingWithCancellation: Story = {
  args: { activityId: "activity-academic-support-ongoing" },
  beforeEach: authenticateAdministrator,
  parameters: {
    docs: {
      description: {
        story:
          "Una actividad en curso no se edita ni se despublica, pero conserva la cancelacion mientras su programa este activo.",
      },
    },
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText("Edición no disponible")).toBeVisible();
    expectNoNotificationControls(canvasElement);
    await expect(await canvas.findByRole("button", { name: "Cancelar actividad" })).toBeVisible();
    if (canvas.queryByRole("button", { name: "Editar actividad" })) {
      throw new Error("Una actividad en curso no debe ofrecer edicion.");
    }
  },
};

export const ConfirmingCancellation: Story = {
  args: { activityId: "activity-academic-support-ongoing" },
  beforeEach: authenticateAdministrator,
  parameters: {
    docs: {
      description: {
        story:
          "La confirmacion de cancelacion conserva un motivo opcional y ofrece volver sin cambios en lugar de cancelar el panel.",
      },
    },
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Cancelar actividad" }));

    const formElement = canvas.getByRole("form", { name: /cancelar actividad/i });
    const form = within(formElement);
    expectNoNotificationControls(formElement);
    await expect(
      form.getByRole("textbox", { name: "Motivo de cancelación — opcional" }),
    ).toBeVisible();
    await expect(form.getByRole("button", { name: "Volver sin cambios" })).toBeVisible();
  },
};

export const CancelOnlyPermission: Story = {
  args: { activityId: "activity-open-data-governance", mode: "operational" },
  beforeEach: authenticateCollaborator,
  parameters: {
    activityStory: {
      configure: (adapters: AppAdapters) => {
        adapters.userScopes = {
          ...adapters.userScopes,
          loadUserScopes: () =>
            Promise.resolve([
              createUserScope({
                eventProgram: null,
                id: "program-innovation-week",
                name: "Semana de Innovacion Academica",
                permissions: [permission("activity:read"), permission("activity:cancel")],
                status: "ACTIVE",
                type: "program",
              }),
            ]),
        };
      },
    },
    docs: {
      description: {
        story:
          "Un colaborador con solo `activity:cancel` cancela pero no edita ni publica; las capacidades se resuelven desde el scope efectivo, no desde un rol.",
      },
    },
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByRole("button", { name: "Cancelar actividad" })).toBeVisible();
    expectNoNotificationControls(canvasElement);
    await expect(canvas.queryByRole("button", { name: "Editar actividad" })).toBeNull();
    await expect(canvas.queryByRole("button", { name: "Despublicar actividad" })).toBeNull();
    await expect(canvas.queryByRole("button", { name: "Publicar actividad" })).toBeNull();
  },
};

export const WithoutReadAccess: Story = {
  args: { activityId: "activity-open-data-governance", mode: "operational" },
  beforeEach: authenticateCollaborator,
  parameters: {
    activityStory: {
      configure: (adapters: AppAdapters) => {
        adapters.userScopes = {
          ...adapters.userScopes,
          loadUserScopes: () => Promise.resolve([]),
        };
      },
    },
    docs: {
      description: {
        story:
          "Sin un scope vigente que conceda `activity:read`, el detalle no se presenta: la vista bloquea el nombre, los datos y las acciones aunque la lectura exista en cache.",
      },
    },
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText("Contexto no autorizado")).toBeVisible();
    await expect(canvas.queryByRole("heading", { level: 1, name: /gobernanza/i })).toBeNull();
    await expect(canvas.queryByRole("button", { name: "Editar actividad" })).toBeNull();
    expectNoNotificationControls(canvasElement);
  },
};

export const VerifyingAccess: Story = {
  args: { activityId: "activity-open-data-governance", mode: "operational" },
  beforeEach: authenticateCollaborator,
  parameters: {
    activityStory: {
      configure: (adapters: AppAdapters) => {
        adapters.userScopes = {
          ...adapters.userScopes,
          loadUserScopes: () => new Promise<never>(() => undefined),
        };
      },
    },
    docs: {
      description: {
        story:
          "Mientras el descubrimiento de scopes esta en curso, la vista no anticipa el nombre ni los datos del detalle.",
      },
    },
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText("Verificando acceso")).toBeVisible();
    await expect(canvas.queryByRole("heading", { level: 1, name: /gobernanza/i })).toBeNull();
    await expect(canvas.queryByRole("button", { name: "Editar actividad" })).toBeNull();
    expectNoNotificationControls(canvasElement);
  },
};

export const CancelledActivity: Story = {
  args: { activityId: CANCELLED_ACTIVITY.id },
  beforeEach: authenticateAdministrator,
  parameters: {
    activityStory: {
      configure: (adapters: AppAdapters) => {
        adapters.activities = {
          ...adapters.activities,
          getActivity: () => Promise.resolve(CANCELLED_ACTIVITY),
        };
        adapters.eventPrograms = {
          ...adapters.eventPrograms,
          loadEventPrograms: () =>
            Promise.resolve([
              createEventProgramListItem({
                id: CANCELLED_ACTIVITY.eventProgram.id,
                name: CANCELLED_ACTIVITY.eventProgram.name,
                status: "ACTIVE",
              }),
            ]),
        };
      },
    },
    docs: {
      description: {
        story:
          "Una actividad cancelada muestra su estado y su motivo sin edicion ni transiciones; el motivo puede estar ausente.",
      },
    },
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Cancelada: Lluvia intensa en el campus",
    );
    expectNoNotificationControls(canvasElement);
    await expect(canvas.getByText("Solo lectura")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Editar actividad" })).toBeNull();
    await expect(canvas.queryByRole("button", { name: "Cancelar actividad" })).toBeNull();
  },
};

export const LifecycleFlow: Story = {
  args: { activityId: FLOW_ACTIVITY.id },
  beforeEach: authenticateAdministrator,
  parameters: {
    activityStory: { configure: configureLifecycleFlow },
    docs: {
      description: {
        story:
          "Recorrido completo sobre una misma actividad: despublicacion, publicacion y cancelacion con motivo, cada una reflejada en el estado visible.",
      },
    },
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await canvas.findByRole(
      "heading",
      { level: 1, name: "Gobernanza de datos abiertos universitarios" },
      { timeout: 5000 },
    );
    expectNoNotificationControls(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: "Despublicar actividad" }));
    expectNoNotificationControls(canvas.getByRole("form", { name: /despublicar actividad/i }));
    await userEvent.click(canvas.getByRole("button", { name: "Confirmar despublicación" }));
    await expect(
      await canvas.findByText(/volvió a borrador/i, undefined, { timeout: 5000 }),
    ).toBeVisible();
    await expect(canvas.getByText("Borrador")).toBeVisible();

    await userEvent.click(
      await canvas.findByRole("button", { name: "Publicar actividad" }, { timeout: 5000 }),
    );
    expectNoNotificationControls(canvas.getByRole("form", { name: /publicar actividad/i }));
    await userEvent.click(canvas.getByRole("button", { name: "Confirmar publicación" }));
    await expect(
      await canvas.findByText(/se publicó/i, undefined, { timeout: 5000 }),
    ).toBeVisible();
    await expect(canvas.getByText("Programada")).toBeVisible();

    await userEvent.click(
      await canvas.findByRole("button", { name: "Cancelar actividad" }, { timeout: 5000 }),
    );
    const formElement = canvas.getByRole("form", { name: /cancelar actividad/i });
    const form = within(formElement);
    expectNoNotificationControls(formElement);
    await userEvent.type(
      form.getByRole("textbox", { name: "Motivo de cancelación — opcional" }),
      "Cierre del campus",
    );
    await userEvent.click(form.getByRole("button", { name: "Confirmar cancelación" }));
    await expect(
      await canvas.findByText(/se canceló/i, undefined, { timeout: 5000 }),
    ).toBeVisible();
    await expect(
      await canvas.findByText(/Cancelada: Cierre del campus/i, undefined, { timeout: 5000 }),
    ).toBeVisible();
    expectNoNotificationControls(canvasElement);
  },
};

export const DeletableDraft: Story = {
  args: { activityId: DELETABLE_ACTIVITY.id },
  beforeEach: authenticateAdministrator,
  parameters: {
    activityStory: { configure: configureDraftActivity },
    docs: {
      description: {
        story:
          "Un borrador de un programa activo ofrece eliminacion al administrador junto a la publicacion; la retencion la verifica el servidor.",
      },
    },
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByRole("button", { name: "Eliminar borrador" })).toBeVisible();
    expectNoNotificationControls(canvasElement);
    await expect(canvas.getByRole("button", { name: "Publicar actividad" })).toBeVisible();
  },
};

export const ConfirmingDeletion: Story = {
  args: { activityId: DELETABLE_ACTIVITY.id },
  beforeEach: authenticateAdministrator,
  parameters: {
    activityStory: { configure: configureDraftActivity },
    docs: {
      description: {
        story:
          "La confirmacion nombra la actividad y advierte la retencion; «Volver sin cambios» devuelve el foco a la accion de apertura.",
      },
    },
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Eliminar borrador" }));
    const formElement = canvas.getByRole("form", {
      name: `Eliminar borrador "${DELETABLE_ACTIVITY.name}"`,
    });
    const form = within(formElement);
    expectNoNotificationControls(formElement);

    await expect(form.getByText(/se eliminará de forma permanente/i)).toBeVisible();
    await expect(form.getByRole("button", { name: "Eliminar borrador" })).toBeVisible();
    await userEvent.click(form.getByRole("button", { name: "Volver sin cambios" }));

    await expect(canvas.getByRole("button", { name: "Eliminar borrador" })).toHaveFocus();
  },
};

export const DeleteRejectedByRetention: Story = {
  args: { activityId: DELETABLE_ACTIVITY.id },
  beforeEach: authenticateAdministrator,
  parameters: {
    activityStory: {
      configure: (adapters: AppAdapters) => {
        configureDraftActivity(adapters);
        adapters.activities = {
          ...adapters.activities,
          deleteActivity: () =>
            Promise.reject(Object.assign(new Error("retencion"), { status: 409 })),
        };
      },
    },
    docs: {
      description: {
        story:
          "Un 409 por historial conserva la confirmacion y ofrece releer la actividad sin repetir el DELETE.",
      },
    },
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Eliminar borrador" }));
    const formElement = canvas.getByRole("form", {
      name: `Eliminar borrador "${DELETABLE_ACTIVITY.name}"`,
    });
    const form = within(formElement);
    expectNoNotificationControls(formElement);
    await userEvent.click(form.getByRole("button", { name: "Eliminar borrador" }));

    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      /registros de asistencia o alertas/i,
    );
    await expect(
      canvas.getByRole("form", { name: `Eliminar borrador "${DELETABLE_ACTIVITY.name}"` }),
    ).toBeVisible();
    expectNoNotificationControls(
      canvas.getByRole("form", { name: `Eliminar borrador "${DELETABLE_ACTIVITY.name}"` }),
    );

    await userEvent.click(canvas.getByRole("button", { name: "Actualizar actividad" }));
    await expect(canvas.queryByRole("alert")).toBeNull();
  },
};

export const ArchivedProgram: Story = {
  args: { activityId: DELETABLE_ACTIVITY.id },
  beforeEach: authenticateAdministrator,
  parameters: {
    activityStory: {
      configure: (adapters: AppAdapters) => configureDraftActivity(adapters, "ARCHIVED"),
    },
    docs: {
      description: {
        story:
          "Un programa archivado conserva la lectura pero no ofrece eliminacion ni cancelacion de sus actividades.",
      },
    },
  },
  play: async ({ canvas, canvasElement }) => {
    await canvas.findByRole("heading", { level: 1, name: DELETABLE_ACTIVITY.name });
    expectNoNotificationControls(canvasElement);
    await expect(canvas.queryByRole("button", { name: "Eliminar borrador" })).toBeNull();
    await expect(canvas.queryByRole("button", { name: "Cancelar actividad" })).toBeNull();
  },
};

export const InsufficientDeletePermission: Story = {
  args: { activityId: DELETABLE_ACTIVITY.id, mode: "operational" },
  beforeEach: authenticateCollaborator,
  parameters: {
    activityStory: {
      configure: (adapters: AppAdapters) => {
        adapters.activities = {
          ...adapters.activities,
          getActivity: () => Promise.resolve(DELETABLE_ACTIVITY),
        };
        adapters.userScopes = {
          ...adapters.userScopes,
          loadUserScopes: () =>
            Promise.resolve([
              createUserScope({
                eventProgram: null,
                id: DELETABLE_ACTIVITY.eventProgram.id,
                name: DELETABLE_ACTIVITY.eventProgram.name,
                permissions: [
                  permission("activity:read"),
                  permission("activity:update"),
                  permission("activity:cancel"),
                ],
                status: "ACTIVE",
                type: "program",
              }),
            ]),
        };
      },
    },
    docs: {
      description: {
        story:
          "Un colaborador con lectura, edicion y cancelacion pero sin `activity:delete` cancela pero no elimina.",
      },
    },
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByRole("button", { name: "Cancelar actividad" })).toBeVisible();
    expectNoNotificationControls(canvasElement);
    await expect(canvas.queryByRole("button", { name: "Eliminar borrador" })).toBeNull();
  },
};

export const ConcurrentStateChange: Story = {
  args: { activityId: DELETABLE_ACTIVITY.id },
  beforeEach: () => {
    authenticateAdministrator();
    concurrentActivity = DELETABLE_ACTIVITY;
  },
  parameters: {
    activityStory: {
      configure: (adapters: AppAdapters) => {
        configureDraftActivity(adapters);
        adapters.activities = {
          ...adapters.activities,
          deleteActivity: () =>
            Promise.reject(Object.assign(new Error("conflicto"), { status: 409 })),
          getActivity: () => Promise.resolve(concurrentActivity),
        };
      },
    },
    docs: {
      description: {
        story:
          "Si otra sesion publica el borrador, la relectura retira la opcion de eliminar y deshabilita la confirmacion abierta.",
      },
    },
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Eliminar borrador" }));
    const formElement = canvas.getByRole("form", {
      name: `Eliminar borrador "${DELETABLE_ACTIVITY.name}"`,
    });
    const form = within(formElement);
    expectNoNotificationControls(formElement);
    await userEvent.click(form.getByRole("button", { name: "Eliminar borrador" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      /registros de asistencia o alertas/i,
    );

    concurrentActivity = createAdministrativeActivityDetail({
      ...DELETABLE_ACTIVITY,
      status: "SCHEDULED",
    });
    await userEvent.click(canvas.getByRole("button", { name: "Actualizar actividad" }));

    await expect(await canvas.findByText(/ya no está disponible/i)).toBeVisible();
    expectNoNotificationControls(canvasElement);
    await expect(canvas.getByRole("button", { name: "Eliminar borrador" })).toBeDisabled();
  },
};
