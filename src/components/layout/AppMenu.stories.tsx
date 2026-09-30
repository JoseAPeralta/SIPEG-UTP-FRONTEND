import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";

import { AppMenu } from "./AppMenu";

const meta = {
  component: AppMenu,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  title: "Layout/AppMenu",
} satisfies Meta<typeof AppMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LoggedOut: Story = {
  beforeEach: () => {
    useSessionStore.getState().clearSession();
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: /registrarse/i })).toBeVisible();
    await expect(canvas.getByRole("link", { name: /iniciar sesi[oó]n/i })).toBeVisible();
    await expect(canvas.queryByRole("link", { name: /cambiar contraseña/i })).toBeNull();
    await expect(canvas.queryByRole("link", { name: /mi perfil/i })).toBeNull();
  },
};

export const Administrator: Story = {
  beforeEach: () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "ADMIN" }),
      tokens: createAuthTokens(),
    });
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: /panel de administracion/i })).toBeVisible();
    await expect(canvas.getByRole("link", { name: /mi perfil/i })).toHaveAttribute(
      "href",
      "/perfil",
    );
    await expect(canvas.queryByRole("link", { name: /cambiar contrase[nñ]a/i })).toBeNull();
    await expect(canvas.getByRole("button", { name: /cerrar sesi[oó]n/i })).toBeVisible();
  },
};

export const StandardUser: Story = {
  beforeEach: () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "USER" }),
      tokens: createAuthTokens(),
    });
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("link", { name: /panel de administracion/i })).toBeNull();
    await expect(canvas.getByRole("link", { name: /mi perfil/i })).toHaveAttribute(
      "href",
      "/perfil",
    );
    await expect(canvas.queryByRole("link", { name: /cambiar contrase[nñ]a/i })).toBeNull();
    await expect(canvas.getByRole("button", { name: /cerrar sesi[oó]n/i })).toBeVisible();
  },
};
