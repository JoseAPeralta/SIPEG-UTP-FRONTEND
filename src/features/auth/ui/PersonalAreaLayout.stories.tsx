import { Stack, Text } from "@chakra-ui/react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { useEffect } from "react";
import { Route, Routes, useNavigate } from "react-router";

import { Surface } from "@/components";

import { PersonalAreaLayout } from "./PersonalAreaLayout";

function SectionPreview({ title }: { title: string }) {
  return (
    <Surface padding="roomy">
      <Stack gap={2}>
        <Text color="text.muted">Contenido de la seccion</Text>
        <Text color="text.default" fontWeight="700">
          {title}
        </Text>
      </Stack>
    </Surface>
  );
}

/**
 * The Storybook decorator already provides one router mounted at `/`, and React Router rejects a
 * router nested inside another one, so the frame navigates the shared router to the section under
 * review. That also means the `NavLink` state exercised by `play` is the same one a person gets in
 * the application.
 */
function PersonalAreaFrame({ active }: { active: string }) {
  const navigate = useNavigate();

  useEffect(() => {
    void navigate(active);
  }, [active, navigate]);

  return (
    <Routes>
      <Route element={<PersonalAreaLayout />}>
        <Route path="perfil/datos" element={<SectionPreview title="Datos de la cuenta" />} />
        <Route
          path="perfil/seguridad"
          element={<SectionPreview title="Seguridad de la cuenta" />}
        />
        <Route path="perfil/actividades" element={<SectionPreview title="Mis actividades" />} />
        <Route path="perfil/certificados" element={<SectionPreview title="Mis certificados" />} />
        <Route path="perfil/alertas" element={<SectionPreview title="Mis alertas" />} />
      </Route>
    </Routes>
  );
}

const sections = [
  { href: "/perfil/datos", label: "Datos de la cuenta" },
  { href: "/perfil/seguridad", label: "Seguridad de la cuenta" },
  { href: "/perfil/actividades", label: "Mis actividades" },
  { href: "/perfil/certificados", label: "Mis certificados" },
  { href: "/perfil/alertas", label: "Mis alertas" },
] as const;

const meta = {
  component: PersonalAreaLayout,
  parameters: {
    docs: {
      description: {
        component:
          "Marco comun del area personal. Posee el unico `h1` del area, el submenu de cinco secciones y el contenido de la seccion activa. En escritorio la navegacion es lateral y siempre visible; en movil es un desplegable local que conserva el nombre de la seccion actual a la vista. Cada seccion tiene ruta propia, de modo que el historial del navegador permite volver a la anterior.",
      },
    },
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  title: "Features/Auth/PersonalAreaLayout",
} satisfies Meta<typeof PersonalAreaLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DesktopDataSection: Story = {
  render: () => <PersonalAreaFrame active="/perfil/datos" />,
  play: async ({ canvas }) => {
    const navigation = await canvas.findByRole("navigation", {
      name: /secciones del [aá]rea personal/i,
    });

    await expect(navigation).toBeVisible();

    for (const section of sections) {
      await expect(within(navigation).getByRole("link", { name: section.label })).toHaveAttribute(
        "href",
        section.href,
      );
    }

    await expect(
      within(navigation).getByRole("link", { current: "page", name: "Datos de la cuenta" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("heading", { level: 1, name: /[aá]rea personal/i }),
    ).toBeVisible();
    await expect(canvas.getByText("Datos de la cuenta", { selector: "p" })).toBeVisible();
    await expect(canvas.queryByRole("button")).toBeNull();
  },
};

export const DesktopSecuritySection: Story = {
  render: () => <PersonalAreaFrame active="/perfil/seguridad" />,
  play: async ({ canvas }) => {
    const navigation = await canvas.findByRole("navigation", {
      name: /secciones del [aá]rea personal/i,
    });

    await expect(
      within(navigation).getByRole("link", { current: "page", name: "Seguridad de la cuenta" }),
    ).toBeVisible();
    await expect(within(navigation).getAllByRole("link")).toHaveLength(5);
    await expect(canvas.getByText("Seguridad de la cuenta", { selector: "p" })).toBeVisible();
  },
};
