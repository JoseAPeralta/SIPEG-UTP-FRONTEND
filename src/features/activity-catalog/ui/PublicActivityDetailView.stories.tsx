import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ReactNode } from "react";
import { expect, userEvent } from "storybook/test";

import { AppAdaptersProvider, createAppAdapters, type AppAdapters } from "@/app/adapters";
import { QueryProvider, createQueryClient } from "@/app/query";
import { createPublicActivityDetail } from "@/test/factories";

import type { PublicActivityDetail } from "../model/publicActivityDetail";

import { PublicActivityDetailView } from "./PublicActivityDetailView";

type PublicDetailAdapter = AppAdapters["publicActivityCatalog"];

const LONG_DESCRIPTION =
  "Taller práctico de levantamiento topográfico con drones, abierto a estudiantes de Ingeniería Civil y de Ingeniería de Sistemas Computacionales, con equipos del laboratorio de geodesia y acompañamiento del semillero de inspección.";

const bannerImageSource = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540">
  <defs>
    <linearGradient id="banner" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#6E2411"/>
      <stop offset="0.52" stop-color="#9C3A1E"/>
      <stop offset="1" stop-color="#E59A72"/>
    </linearGradient>
  </defs>
  <rect width="960" height="540" fill="url(#banner)"/>
  <g fill="#FBF7F2" font-family="Georgia, serif">
    <text x="64" y="132" font-size="56" font-weight="700">Taller de Topografía</text>
    <text x="64" y="204" font-size="56" font-weight="700">con Drones</text>
    <text x="64" y="420" font-family="Arial, sans-serif" font-size="24" font-weight="700" letter-spacing="6">AGENDA ACADÉMICA SIPEG</text>
  </g>
</svg>`)}`;

const baseActivity = createPublicActivityDetail({
  bannerUrl: bannerImageSource,
  capacity: 40,
  classroom: {
    building: "Edificio de Aulas",
    id: "classroom-1",
    name: "Auditorio Roberto Barraza",
  },
  date: "2026-10-14",
  description: LONG_DESCRIPTION,
  endTime: "12:00",
  enrolledCount: 12,
  id: "activity-1",
  name: "Taller de Topografía con Drones",
  speakers: [
    { firstName: "Ricardo", id: "speaker-1", lastName: "Arosemena" },
    { firstName: "Luisa", id: "speaker-2", lastName: "Fernandez" },
  ],
  startTime: "09:00",
  status: "SCHEDULED",
  type: "WORKSHOP",
});

function detail(overrides: Partial<PublicActivityDetail> = {}): PublicActivityDetail {
  return { ...baseActivity, ...overrides };
}

/**
 * Provee el puerto publico con un detalle determinista. El resto de adapters
 * siguen siendo los mocks para no montar una composicion distinta por story.
 */
function DetailStoryProviders({
  catalog,
  children,
}: {
  catalog: PublicDetailAdapter;
  children: ReactNode;
}) {
  const [adapters] = useState<AppAdapters>(() => ({
    ...createAppAdapters({ source: "mock" }),
    publicActivityCatalog: catalog,
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

function detailAdapter(
  getPublicActivity: PublicDetailAdapter["getPublicActivity"],
): PublicDetailAdapter {
  return {
    getPublicActivity,
    loadPublicActivities: () => Promise.resolve({ activities: [] }),
  };
}

/**
 * Falla solo la primera consulta y luego resuelve: la story reproduce el fallo
 * reintentable sin exponer nunca el mensaje interno del backend.
 */
function FailingOnceProviders({ children }: { children: ReactNode }) {
  const [catalog] = useState<PublicDetailAdapter>(() => {
    let attempts = 0;

    return detailAdapter(() => {
      attempts += 1;

      return attempts === 1
        ? Promise.reject(new globalThis.Error("detalle interno del backend"))
        : Promise.resolve(detail());
    });
  });

  return <DetailStoryProviders catalog={catalog}>{children}</DetailStoryProviders>;
}

const meta = {
  args: { activityId: "activity-1" },
  component: PublicActivityDetailView,
  parameters: {
    docs: {
      description: {
        component:
          "Detalle público de una actividad: programa, unidad, ponentes, aula, horario, capacidad y estado. No expone equipamiento ni asistencia, y una cancelada muestra su motivo.",
      },
    },
    layout: "padded",
  },
  tags: ["autodocs"],
  title: "Features/Activity Catalog/PublicActivityDetailView",
} satisfies Meta<typeof PublicActivityDetailView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [
    (Story) => (
      <DetailStoryProviders catalog={detailAdapter(() => Promise.resolve(detail()))}>
        <Story />
      </DetailStoryProviders>
    ),
  ],
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("heading", { level: 1, name: /taller de topografía con drones/i }),
    ).toBeVisible();
    await expect(canvas.getByText("Programada")).toBeVisible();
    await expect(canvas.getByText("12")).toBeVisible();
    await expect(canvas.getByText("28")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Volver a la agenda" })).toHaveAttribute(
      "href",
      "/",
    );
  },
};

export const Ongoing: Story = {
  decorators: [
    (Story) => (
      <DetailStoryProviders
        catalog={detailAdapter(() => Promise.resolve(detail({ status: "ONGOING" })))}
      >
        <Story />
      </DetailStoryProviders>
    ),
  ],
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("En curso")).toBeVisible();
  },
};

export const Completed: Story = {
  decorators: [
    (Story) => (
      <DetailStoryProviders
        catalog={detailAdapter(() => Promise.resolve(detail({ status: "COMPLETED" })))}
      >
        <Story />
      </DetailStoryProviders>
    ),
  ],
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Completada")).toBeVisible();
  },
};

export const Cancelled: Story = {
  decorators: [
    (Story) => (
      <DetailStoryProviders
        catalog={detailAdapter(() =>
          Promise.resolve(
            detail({
              cancelReason: "Se reprogramará para la semana del 9 de noviembre.",
              status: "CANCELLED",
            }),
          ),
        )}
      >
        <Story />
      </DetailStoryProviders>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "Una cancelada conserva su información y añade un aviso destacado con el motivo informado por el backend.",
      },
    },
  },
  play: async ({ canvas }) => {
    const alert = await canvas.findByRole("alert");

    await expect(alert).toHaveTextContent("Actividad cancelada");
    await expect(alert).toHaveTextContent("Se reprogramará para la semana del 9 de noviembre.");
    await expect(canvas.getByText("Cancelada")).toBeVisible();
  },
};

export const WithoutCapacity: Story = {
  decorators: [
    (Story) => (
      <DetailStoryProviders
        catalog={detailAdapter(() => Promise.resolve(detail({ capacity: null })))}
      >
        <Story />
      </DetailStoryProviders>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "Sin capacidad informada no se calculan cupos: se dice explícitamente en lugar de inventar números.",
      },
    },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/no está informada/i)).toBeVisible();
    await expect(canvas.queryByText("Disponibles")).toBeNull();
  },
};

export const WithoutClassroomOrSpeakers: Story = {
  decorators: [
    (Story) => (
      <DetailStoryProviders
        catalog={detailAdapter(() =>
          Promise.resolve(
            detail({ bannerUrl: null, classroom: null, description: null, speakers: [] }),
          ),
        )}
      >
        <Story />
      </DetailStoryProviders>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Los bloques opcionales desaparecen cuando el contrato no los trae.",
      },
    },
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("heading", { level: 1, name: /taller de topografía con drones/i }),
    ).toBeVisible();
    await expect(canvas.queryByRole("heading", { name: "Descripción" })).toBeNull();
    await expect(canvas.queryByRole("heading", { name: "Expositores" })).toBeNull();
    await expect(canvas.queryByRole("heading", { name: "Aula" })).toBeNull();
  },
};

export const Loading: Story = {
  decorators: [
    (Story) => (
      <DetailStoryProviders catalog={detailAdapter(() => new Promise(() => undefined))}>
        <Story />
      </DetailStoryProviders>
    ),
  ],
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/cargando informacion/i)).toBeVisible();
  },
};

export const Error: Story = {
  decorators: [
    (Story) => (
      <FailingOnceProviders>
        <Story />
      </FailingOnceProviders>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "Un fallo de red no expone el mensaje del backend: muestra un texto localizado y reintenta en el lugar, sin recargar la página.",
      },
    },
  },
  play: async ({ canvas }) => {
    const alert = await canvas.findByRole("alert");

    await expect(alert).toHaveTextContent(/no se pudo cargar la informacion/i);
    await expect(alert).not.toHaveTextContent(/detalle interno/i);

    await userEvent.click(canvas.getByRole("button", { name: /reintentar/i }));

    await expect(
      await canvas.findByRole("heading", { level: 1, name: /taller de topografía con drones/i }),
    ).toBeVisible();
  },
};

export const NotFound: Story = {
  decorators: [
    (Story) => (
      <DetailStoryProviders catalog={detailAdapter(() => Promise.resolve(null))}>
        <Story />
      </DetailStoryProviders>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "Un identificador inexistente o no público se presenta como no disponible, con salida a la agenda y sin reintento.",
      },
    },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Actividad no disponible")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Volver a la agenda" })).toHaveAttribute(
      "href",
      "/",
    );
    await expect(canvas.queryByRole("button", { name: /reintentar/i })).toBeNull();
  },
};
