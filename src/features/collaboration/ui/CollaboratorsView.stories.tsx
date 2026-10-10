import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import {
  collaborationStorySession,
  storyScope,
  type CollaborationScenario,
} from "@/test/collaborationStories";
import { CollaborationStoryProviders } from "@/test/CollaborationStoryProviders";
import { CollaboratorsView } from "./CollaboratorsView";

const meta = {
  title: "Features/Collaboration/CollaboratorsView",
  component: CollaboratorsView,
  args: { scope: storyScope, canManage: true },
  beforeEach: (context) => collaborationStorySession(context.parameters["scenario"] === "admin"),
  decorators: [
    (Story, context) => (
      <CollaborationStoryProviders
        key={context.id}
        scenario={(context.parameters["scenario"] ?? "manage") as CollaborationScenario}
      >
        <Story />
      </CollaborationStoryProviders>
    ),
  ],
} satisfies Meta<typeof CollaboratorsView>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Delegator: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Ana Pérez")).toBeVisible();
    await userEvent.click(canvas.getByText("Ver permisos de Ana Pérez"));
    await expect(canvas.getByText("Heredado del programa")).toBeVisible();
  },
};
export const Add: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(await canvas.findByLabelText("Identificador de la persona"), "new-person");
    await userEvent.click(canvas.getByRole("button", { name: "Agregar colaborador" }));
    await expect(await canvas.findByText("Colaborador agregado.")).toBeVisible();
    await expect(await canvas.findByText("Nueva Persona")).toBeVisible();
  },
};
export const RoleChange: Story = {
  play: async ({ canvas }) => {
    await userEvent.selectOptions(await canvas.findByLabelText("Rol de Ana Pérez"), "EDITOR");
    await userEvent.click(canvas.getByRole("button", { name: "Guardar rol de Ana Pérez" }));
    await expect(await canvas.findByText("Rol actual: Editor")).toBeVisible();
  },
};
export const RemovalConflict: Story = {
  parameters: { scenario: "conflict" },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Retirar a Ana Pérez" }));
    await userEvent.click(canvas.getByRole("button", { name: "Confirmar retirada de Ana Pérez" }));
    await expect(
      await canvas.findByText(/El contexto debe conservar una persona capaz de delegar/),
    ).toBeVisible();
  },
};
export const Administrator: Story = {
  parameters: { scenario: "admin" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText("Buscar persona")).toBeVisible();
  },
};
export const Empty: Story = {
  parameters: { scenario: "empty" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Sin colaboradores locales")).toBeVisible();
  },
};
export const Denied: Story = {
  args: { canManage: false },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Colaboradores restringidos")).toBeVisible();
  },
};
export const ReadOnlyArchived: Story = {
  args: { canManage: true, readOnly: true },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(
        "El programa está archivado. Puede consultar sus colaboradores, pero no modificarlos.",
      ),
    ).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Agregar colaborador" })).toBeNull();
    await userEvent.click(await canvas.findByText("Ver permisos de Ana Pérez"));
    await expect(canvas.getByText("Heredado del programa")).toBeVisible();
  },
};
export const Error: Story = {
  parameters: { scenario: "listError" },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("No se pudieron consultar los colaboradores."),
    ).toBeVisible();
  },
};
export const PermissionGrant: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByText("Ver permisos de Ana Pérez"));
    await userEvent.selectOptions(
      await canvas.findByLabelText("Permiso a otorgar"),
      "program:read",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Otorgar permiso" }));
    await expect(await canvas.findByText("Permiso otorgado.")).toBeVisible();
    await expect((await canvas.findAllByText("Ver programas de eventos")).length).toBeGreaterThan(
      0,
    );
  },
};
export const PermissionRevoke: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByText("Ver permisos de Ana Pérez"));
    await userEvent.click(canvas.getByRole("button", { name: "Revocar Actualizar actividades" }));
    await expect(await canvas.findByText("Permiso revocado.")).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: "Revocar Actualizar actividades" }),
    ).toBeNull();
  },
};
export const PermissionConflict: Story = {
  parameters: { scenario: "conflict" },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByText("Ver permisos de Ana Pérez"));
    await userEvent.click(canvas.getByRole("button", { name: "Revocar Actualizar actividades" }));
    await expect(await canvas.findByText(/No se pudo revocar el permiso/)).toBeVisible();
  },
};
