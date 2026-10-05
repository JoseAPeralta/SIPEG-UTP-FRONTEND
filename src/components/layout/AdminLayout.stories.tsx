import { Box, Heading, Text } from "@chakra-ui/react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Route, Routes } from "react-router";

import { useSessionStore } from "@/store/session";
import { useWorkingContextStore } from "@/store/workingContext";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";

import { AdminLayout } from "./AdminLayout";

const meta = {
  component: AdminLayout,
  parameters: {
    docs: {
      description: {
        component:
          "Marco de las rutas administrativas. Sustituye la navegacion publica por el menu del panel y el selector de contexto de trabajo.",
      },
    },
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  title: "Layout/AdminLayout",
} satisfies Meta<typeof AdminLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

function renderAdminRoute(children: React.ReactNode) {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={children} />
      </Route>
    </Routes>
  );
}

export const WithOutlet: Story = {
  beforeEach: () => {
    useWorkingContextStore.getState().clearWorkingContext();
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "ADMIN" }),
      tokens: createAuthTokens(),
    });
  },
  render: () =>
    renderAdminRoute(
      <Box as="section" aria-labelledby="admin-page-title">
        <Heading color="text.default" fontFamily="heading" id="admin-page-title" size="lg">
          Resumen operativo
        </Heading>
        <Text color="text.muted" mt={2}>
          El contenido administrativo se inyecta mediante el `Outlet`.
        </Text>
      </Box>,
    ),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("navigation", { name: /navegacion del panel/i }),
    ).toBeVisible();
    await expect(
      await canvas.findByRole("combobox", { name: /contexto de trabajo/i }),
    ).toBeEnabled();
    await expect(canvas.getByRole("heading", { name: /resumen operativo/i })).toBeVisible();
  },
};

export const WithoutWorkingContext: Story = {
  beforeEach: () => {
    useWorkingContextStore.getState().clearWorkingContext();
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "ADMIN" }),
      tokens: createAuthTokens(),
    });
  },
  render: () =>
    renderAdminRoute(
      <Box as="section" aria-labelledby="admin-context-page-title">
        <Heading color="text.default" fontFamily="heading" id="admin-context-page-title" size="lg">
          Modulo que requiere contexto
        </Heading>
      </Box>,
    ),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(/las demas paginas requieren seleccionar un programa o actividad/i),
    ).toBeVisible();
  },
};
