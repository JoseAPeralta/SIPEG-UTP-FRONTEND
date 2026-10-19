import { Stack } from "@chakra-ui/react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ReactNode } from "react";
import { expect, userEvent, within } from "storybook/test";

import {
  AppAdaptersProvider,
  createAppAdapters,
  type AlertsAdapter,
  type AppAdapters,
} from "@/app/adapters";
import { QueryProvider, createQueryClient } from "@/app/query";
import { useSessionStore } from "@/store/session";
import {
  createAlert,
  createAlertsPage,
  createAuthenticatedUser,
  createAuthTokens,
  createUserScope,
} from "@/test/factories";

import type { Alert } from "../model/alert";

import { AlertsInboxView } from "./AlertsInboxView";
import { UnreadAlertsIndicator } from "./UnreadAlertsIndicator";

const activityAlert = createAlert({
  id: "alert-activity",
  isRead: false,
  target: { id: "activity-1", kind: "ACTIVITY" },
  type: "ACTIVITY_UPDATED",
});
const proposalAlert = createAlert({
  createdAt: "2026-06-10T13:00:00.000Z",
  id: "alert-proposal",
  isRead: true,
  target: { id: "proposal-1", kind: "PROPOSAL" },
  type: "PROPOSAL_RECEIVED",
});
const activityScope = createUserScope({
  id: "activity-1",
  name: "Taller de datos abiertos",
  permissions: [{ name: "activity:read", origin: "INHERITED", validFrom: null, validUntil: null }],
  type: "activity",
});

function InboxStoryProviders({
  alerts,
  userScopes,
  children,
}: {
  alerts: AlertsAdapter;
  userScopes: AppAdapters["userScopes"];
  children: ReactNode;
}) {
  const [adapters] = useState(() => ({
    ...createAppAdapters({ source: "mock" }),
    alerts,
    userScopes,
  }));
  const [client] = useState(() =>
    createQueryClient({ defaultOptions: { queries: { retry: false } } }),
  );

  return (
    <AppAdaptersProvider adapters={adapters}>
      <QueryProvider client={client} persist={false}>
        {children}
      </QueryProvider>
    </AppAdaptersProvider>
  );
}

const scopes = { loadUserScopes: () => Promise.resolve([activityScope]) };

/**
 * Adapter de solo lectura: las stories que no marcan alertas no pueden mutar nada.
 */
function reading(loadAlertsPage: AlertsAdapter["loadAlertsPage"]): AlertsAdapter {
  return {
    loadAlertsPage,
    markAlertRead: () => Promise.reject(new Error("Esta story no marca alertas.")),
    markAllAlertsRead: () => Promise.reject(new Error("Esta story no marca alertas.")),
  };
}

/**
 * Bandeja mutable: lecturas y mutaciones comparten estado, de modo que la revalidacion posterior
 * confirma el cambio. `failReads` reproduce el rechazo del backend sin exponer su mensaje.
 */
function mutating(initial: Alert[], { failReads = false } = {}): AlertsAdapter {
  let inbox = initial.map((alert) => structuredClone(alert));

  return {
    loadAlertsPage(filters, page) {
      const filtered = inbox
        .filter((alert) => filters.isRead === undefined || alert.isRead === filters.isRead)
        .filter((alert) => !filters.type || alert.type === filters.type)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
      const totalPages = Math.max(1, Math.ceil(filtered.length / 20));
      const start = (Math.max(1, page) - 1) * 20;

      return Promise.resolve({
        items: structuredClone(filtered.slice(start, start + 20)),
        limit: 20,
        page,
        total: filtered.length,
        totalPages,
      });
    },
    markAlertRead(id) {
      if (failReads) {
        return Promise.reject(
          Object.assign(new Error("detalle interno del backend"), { status: 500 }),
        );
      }

      const alert = inbox.find((candidate) => candidate.id === id);
      if (!alert) {
        return Promise.reject(Object.assign(new Error("no existe"), { status: 404 }));
      }

      alert.isRead = true;

      return Promise.resolve(structuredClone(alert));
    },
    markAllAlertsRead() {
      if (failReads) {
        return Promise.reject(
          Object.assign(new Error("detalle interno del backend"), { status: 500 }),
        );
      }

      const updatedCount = inbox.filter((alert) => !alert.isRead).length;
      inbox = inbox.map((alert) => ({ ...alert, isRead: true }));

      return Promise.resolve({ updatedCount });
    },
  };
}

function signIn() {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ id: "user-1" }),
    tokens: createAuthTokens(),
  });
}

const meta = {
  component: AlertsInboxView,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  title: "Features/Alerts/AlertsInboxView",
} satisfies Meta<typeof AlertsInboxView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  beforeEach: signIn,
  decorators: [
    (Story) => (
      <InboxStoryProviders alerts={reading(() => new Promise(() => undefined))} userScopes={scopes}>
        <Story />
      </InboxStoryProviders>
    ),
  ],
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/cargando informacion/i)).toBeVisible();
  },
};

export const Empty: Story = {
  beforeEach: signIn,
  decorators: [
    (Story) => (
      <InboxStoryProviders
        alerts={reading(() =>
          Promise.resolve(createAlertsPage({ items: [], total: 0, totalPages: 1 })),
        )}
        userScopes={scopes}
      >
        <Story />
      </InboxStoryProviders>
    ),
  ],
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/no tienes alertas/i)).toBeVisible();
  },
};

export const Populated: Story = {
  beforeEach: signIn,
  decorators: [
    (Story) => (
      <InboxStoryProviders
        alerts={reading(() =>
          Promise.resolve(createAlertsPage({ items: [activityAlert, proposalAlert], total: 2 })),
        )}
        userScopes={scopes}
      >
        <Story />
      </InboxStoryProviders>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "La alerta de actividad tiene un destino autorizado y muestra enlace al contexto operativo; la propuesta, que todavia no tiene ruta de detalle, se muestra informativa y sin enlace.",
      },
    },
  },
  play: async ({ canvas }) => {
    const list = await canvas.findByRole("list", { name: /lista de alertas/i });

    await expect(list).toHaveTextContent("Actividad actualizada");
    await expect(
      await canvas.findByRole("link", { name: "Ver contexto de la actividad" }),
    ).toHaveAttribute("href", "/operaciones/actividades/activity-1");
    await expect(canvas.queryByRole("link", { name: /propuesta/i })).toBeNull();
  },
};

export const FilteredEmpty: Story = {
  beforeEach: signIn,
  decorators: [
    (Story) => (
      <InboxStoryProviders
        alerts={reading((filters) =>
          Promise.resolve(
            filters.type === "PROGRAM_UPDATED"
              ? createAlertsPage({ items: [], total: 0, totalPages: 1 })
              : createAlertsPage({ items: [activityAlert], total: 1 }),
          ),
        )}
        userScopes={scopes}
      >
        <Story />
      </InboxStoryProviders>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "Un filtro sin coincidencias explica que se ajusten los filtros, en lugar de afirmar que la cuenta no tiene alertas.",
      },
    },
  },
  play: async ({ canvas }) => {
    const list = await canvas.findByRole("list", { name: /lista de alertas/i });

    await expect(list).toHaveTextContent("Actividad actualizada");

    await userEvent.selectOptions(
      canvas.getByRole("combobox", { name: "Tipo" }),
      "PROGRAM_UPDATED",
    );

    await expect(await canvas.findByText(/no hay alertas que coincidan/i)).toBeVisible();
  },
};

export const Failure: Story = {
  beforeEach: signIn,
  decorators: [
    (Story) => (
      <InboxStoryProviders
        alerts={reading(() => Promise.reject(new Error("alertas caidas")))}
        userScopes={scopes}
      >
        <Story />
      </InboxStoryProviders>
    ),
  ],
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent("alertas caidas");
    await expect(canvas.getByRole("button", { name: /^reintentar$/i })).toBeVisible();
    await expect(canvas.getByRole("combobox", { name: "Estado" })).toBeVisible();
  },
};

export const AccessFailure: Story = {
  beforeEach: signIn,
  decorators: [
    (Story) => (
      <InboxStoryProviders
        alerts={reading(() =>
          Promise.resolve(createAlertsPage({ items: [activityAlert], total: 1 })),
        )}
        userScopes={{ loadUserScopes: () => Promise.reject(new Error("scopes caidos")) }}
      >
        <Story />
      </InboxStoryProviders>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "Si el descubrimiento de permisos falla, las alertas siguen visibles sin enlaces y con un reintento, porque un fallo de permisos no prueba que no haya alertas.",
      },
    },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("list", { name: /lista de alertas/i })).toBeVisible();
    await expect(
      await canvas.findByText(/no se pudo comprobar el acceso a los destinos/i),
    ).toBeVisible();
    await expect(canvas.queryByRole("link", { name: /ver contexto/i })).toBeNull();
  },
};

export const MarkOne: Story = {
  beforeEach: signIn,
  decorators: [
    (Story) => (
      <InboxStoryProviders alerts={mutating([activityAlert, proposalAlert])} userScopes={scopes}>
        <Story />
      </InboxStoryProviders>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "Marcar una alerta como leida actualiza la tarjeta sin recargar y anuncia el resultado sin mover el foco de forma brusca.",
      },
    },
  },
  play: async ({ canvas }) => {
    const list = await canvas.findByRole("list", { name: /lista de alertas/i });

    await userEvent.click(within(list).getByRole("button", { name: "Marcar como leída" }));

    await expect(await canvas.findByText("Alerta marcada como leída.")).toBeVisible();
    await expect(within(list).queryByRole("button", { name: "Marcar como leída" })).toBeNull();
    await expect(within(list).getAllByText("Leída")).toHaveLength(2);
  },
};

export const MarkAll: Story = {
  beforeEach: signIn,
  decorators: [
    (Story) => (
      <InboxStoryProviders
        alerts={mutating([
          createAlert({ id: "alert-a", isRead: false, type: "ACTIVITY_UPDATED" }),
          createAlert({ id: "alert-b", isRead: false, type: "PROGRAM_UPDATED" }),
        ])}
        userScopes={scopes}
      >
        <Stack gap={6}>
          <UnreadAlertsIndicator />
          <Story />
        </Stack>
      </InboxStoryProviders>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "Marcar todas usa el conteo real del servidor y comparte el mismo cliente de consultas con el indicador global, que baja a cero de inmediato.",
      },
    },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Alertas · 2")).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "Marcar todas como leídas" }));

    await expect(await canvas.findByText("Se marcaron 2 alertas como leídas.")).toBeVisible();
    await expect(await canvas.findByText("Alertas · 0")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Marcar como leída" })).toBeNull();
  },
};

export const ReadFailure: Story = {
  beforeEach: signIn,
  decorators: [
    (Story) => (
      <InboxStoryProviders
        alerts={mutating([activityAlert], { failReads: true })}
        userScopes={scopes}
      >
        <Story />
      </InboxStoryProviders>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "Si el backend rechaza la accion, la tarjeta vuelve a Sin leer y se muestra un mensaje localizado, nunca el detalle interno.",
      },
    },
  },
  play: async ({ canvas }) => {
    const list = await canvas.findByRole("list", { name: /lista de alertas/i });

    await userEvent.click(within(list).getByRole("button", { name: "Marcar como leída" }));

    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      /no se pudo actualizar el estado de lectura/i,
    );
    await expect(within(list).getByText("Sin leer")).toBeVisible();
    await expect(within(list).getByRole("button", { name: "Marcar como leída" })).toBeEnabled();
  },
};
