import { Box, Heading, Text } from "@chakra-ui/react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Route, Routes } from "react-router";

import { AppLayout } from "./AppLayout";

const meta = {
  component: AppLayout,
  parameters: {
    docs: {
      description: {
        component:
          "Marco de las rutas publicas. Renderiza menu principal, contenido y footer alrededor del `Outlet` de React Router.",
      },
    },
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  title: "Layout/AppLayout",
} satisfies Meta<typeof AppLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithOutlet: Story = {
  render: () => (
    <Routes>
      <Route element={<AppLayout />}>
        <Route
          index
          element={
            <Box as="section" aria-labelledby="public-page-title">
              <Heading color="text.default" fontFamily="heading" id="public-page-title" size="lg">
                Catalogo publico de actividades
              </Heading>
              <Text color="text.muted" mt={2}>
                El contenido de la ruta se inyecta mediante el `Outlet`.
              </Text>
            </Box>
          }
        />
      </Route>
    </Routes>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: /^sipeg$/i })).toHaveAttribute("href", "/");
    await expect(canvas.getByRole("navigation", { name: /navegacion principal/i })).toBeVisible();
    await expect(
      canvas.getByRole("heading", { name: /catalogo publico de actividades/i }),
    ).toBeVisible();
    await expect(canvas.getByRole("contentinfo")).toBeVisible();
    await expect(canvas.getByRole("link", { name: /saltar al contenido/i })).toHaveAttribute(
      "href",
      "#main-content",
    );
  },
};
