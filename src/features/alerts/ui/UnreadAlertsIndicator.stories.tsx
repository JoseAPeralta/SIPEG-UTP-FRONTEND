import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { expect } from "storybook/test";

import { AppAdaptersProvider, createAppAdapters, type AlertsAdapter } from "@/app/adapters";
import { QueryProvider, createQueryClient } from "@/app/query";
import { useSessionStore } from "@/store/session";
import {
  createAlert,
  createAlertsPage,
  createAuthenticatedUser,
  createAuthTokens,
} from "@/test/factories";

import { UnreadAlertsIndicator } from "./UnreadAlertsIndicator";

function IndicatorStoryProviders({
  alerts,
  children,
}: {
  alerts: AlertsAdapter;
  children: ReactNode;
}) {
  const [adapters] = useState(() => ({ ...createAppAdapters({ source: "mock" }), alerts }));
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

function resolving(alerts: AlertsAdapter["loadAlertsPage"]): AlertsAdapter {
  return {
    loadAlertsPage: alerts,
    markAlertRead: () => Promise.reject(new Error("El indicador no marca alertas.")),
    markAllAlertsRead: () => Promise.reject(new Error("El indicador no marca alertas.")),
  };
}

function signIn() {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ id: "user-1" }),
    tokens: createAuthTokens(),
  });
}

/**
 * The shared Storybook router starts at `/`, so the active state is exercised by navigating it to
 * the inbox instead of nesting a second router, which React Router rejects.
 */
function InboxRouteFrame() {
  const navigate = useNavigate();

  useEffect(() => {
    void navigate("/perfil/alertas");
  }, [navigate]);

  return <UnreadAlertsIndicator />;
}

const meta = {
  component: UnreadAlertsIndicator,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  title: "Features/Alerts/UnreadAlertsIndicator",
} satisfies Meta<typeof UnreadAlertsIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoSession: Story = {
  beforeEach: () => useSessionStore.getState().clearSession(),
  decorators: [
    (Story) => (
      <IndicatorStoryProviders
        alerts={resolving(() => Promise.reject(new Error("no debe consultarse")))}
      >
        <Story />
      </IndicatorStoryProviders>
    ),
  ],
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/alertas/i)).toBeNull();
  },
};

export const Loading: Story = {
  beforeEach: signIn,
  decorators: [
    (Story) => (
      <IndicatorStoryProviders alerts={resolving(() => new Promise(() => undefined))}>
        <Story />
      </IndicatorStoryProviders>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "El esqueleto del conteo se anuncia como carga, nunca como cero, para no afirmar un dato que aun no existe.",
      },
    },
  },
  play: async ({ canvas }) => {
    const link = canvas.getByRole("link", { name: "Cargando alertas" });

    await expect(link).toHaveAttribute("href", "/perfil/alertas");
    await expect(canvas.getByText("Alertas · …")).toBeVisible();
    await expect(canvas.queryByText("Alertas · 0")).toBeNull();
  },
};

export const Zero: Story = {
  beforeEach: signIn,
  decorators: [
    (Story) => (
      <IndicatorStoryProviders
        alerts={resolving(() =>
          Promise.resolve(createAlertsPage({ items: [], total: 0, totalPages: 1 })),
        )}
      >
        <Story />
      </IndicatorStoryProviders>
    ),
  ],
  play: async ({ canvas }) => {
    const link = await canvas.findByRole("link", { name: "No tienes alertas sin leer" });

    await expect(link).toHaveAttribute("href", "/perfil/alertas");
    await expect(canvas.getByText("Alertas · 0")).toBeVisible();
  },
};

export const One: Story = {
  beforeEach: signIn,
  decorators: [
    (Story) => (
      <IndicatorStoryProviders
        alerts={resolving(() => Promise.resolve(createAlertsPage({ total: 1 })))}
      >
        <Story />
      </IndicatorStoryProviders>
    ),
  ],
  play: async ({ canvas }) => {
    const link = await canvas.findByRole("link", { name: "Tienes 1 alerta sin leer" });

    await expect(link).toHaveAttribute("href", "/perfil/alertas");
    await expect(canvas.getByText("Alertas · 1")).toBeVisible();
  },
};

export const Several: Story = {
  beforeEach: signIn,
  decorators: [
    (Story) => (
      <IndicatorStoryProviders
        alerts={resolving(() =>
          Promise.resolve(createAlertsPage({ items: [createAlert()], total: 21, totalPages: 2 })),
        )}
      >
        <Story />
      </IndicatorStoryProviders>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "El conteo sale de `total` y no de los items de la pagina: con 21 alertas en dos paginas, la forma corta muestra 21 aunque la respuesta traiga una sola.",
      },
    },
  },
  play: async ({ canvas }) => {
    const link = await canvas.findByRole("link", { name: "Tienes 21 alertas sin leer" });

    await expect(link).toHaveAttribute("href", "/perfil/alertas");
    await expect(canvas.getByText("Alertas · 21")).toBeVisible();
  },
};

export const Failure: Story = {
  beforeEach: signIn,
  decorators: [
    (Story) => (
      <IndicatorStoryProviders
        alerts={resolving(() => Promise.reject(new Error("alertas caidas")))}
      >
        <Story />
      </IndicatorStoryProviders>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "Un fallo se anuncia como conteo no disponible y jamas se degrada a cero, para no afirmar que no hay alertas cuando el sistema no pudo confirmarlo.",
      },
    },
  },
  play: async ({ canvas }) => {
    const link = await canvas.findByRole("link", {
      name: "No se pudo actualizar el conteo de alertas",
    });

    await expect(link).toHaveAttribute("href", "/perfil/alertas");
    await expect(canvas.getByText("Alertas · —")).toBeVisible();
    await expect(canvas.queryByText("Alertas · 0")).toBeNull();
  },
};

export const CurrentPage: Story = {
  beforeEach: signIn,
  decorators: [
    (Story) => (
      <IndicatorStoryProviders
        alerts={resolving(() => Promise.resolve(createAlertsPage({ total: 2 })))}
      >
        <Story />
      </IndicatorStoryProviders>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "En la bandeja, el indicador se marca con `aria-current` y relleno solido, de modo que el estado activo no depende solo del color.",
      },
    },
  },
  render: () => <InboxRouteFrame />,
  play: async ({ canvas }) => {
    const link = await canvas.findByRole("link", { name: "Tienes 2 alertas sin leer" });

    await expect(link).toHaveAttribute("aria-current", "page");
  },
};
