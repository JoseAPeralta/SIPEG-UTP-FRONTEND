import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { PermissionList } from "./PermissionList";

const meta = {
  title: "Features/Collaboration/PermissionList",
  component: PermissionList,
} satisfies Meta<typeof PermissionList>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Local: Story = {
  args: {
    permissions: [
      {
        name: "program:read",
        origin: "LOCAL",
        validFrom: null,
        validUntil: null,
        source: "ROLE_DEFAULT",
        effective: true,
      },
    ],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Local")).toBeVisible();
  },
};
export const Inherited: Story = {
  args: {
    permissions: [
      { name: "activity:read", origin: "INHERITED", validFrom: null, validUntil: null },
    ],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Heredado del programa")).toBeVisible();
    await expect(canvas.queryByRole("button")).not.toBeInTheDocument();
  },
};
export const Combined: Story = {
  args: {
    permissions: [
      {
        name: "activity:update",
        origin: "BOTH",
        source: "OVERRIDE",
        validFrom: "2026-01-01T00:00:00Z",
        validUntil: "2030-01-01T00:00:00Z",
        effective: true,
      },
    ],
  },
};
export const Unknown: Story = {
  args: {
    permissions: [
      { name: "future:permission", origin: "LOCAL", validFrom: null, validUntil: null },
    ],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Permiso no reconocido")).toBeVisible();
  },
};
export const Empty: Story = { args: { permissions: [] } };
