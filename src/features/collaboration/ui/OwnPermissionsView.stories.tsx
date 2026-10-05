import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { createAppAdapters, AppAdaptersProvider } from "@/app/adapters";
import { QueryProvider, createQueryClient } from "@/app/query";
import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { OwnPermissionsView } from "./OwnPermissionsView";

const scope = { type: "activity" as const, id: "story-activity" };
const meta = {
  title: "Features/Collaboration/OwnPermissionsView",
  component: OwnPermissionsView,
  args: { scope },
  beforeEach: () => {
    useSessionStore
      .getState()
      .setSession({ currentUser: createAuthenticatedUser(), tokens: createAuthTokens() });
    return () => useSessionStore.getState().clearSession();
  },
  decorators: [
    (Story, context) => {
      const error = context.parameters["permissionError"] === true;
      const adapters = {
        ...createAppAdapters({ source: "mock" }),
        ownPermissions: {
          loadOwnPermissions: () =>
            error
              ? Promise.reject(new globalThis.Error("No disponible"))
              : Promise.resolve({
                  scope,
                  permissions: [
                    {
                      name: "activity:read",
                      origin: "INHERITED" as const,
                      validFrom: null,
                      validUntil: null,
                    },
                  ],
                }),
        },
      };
      return (
        <AppAdaptersProvider adapters={adapters}>
          <QueryProvider
            client={createQueryClient({ defaultOptions: { queries: { retry: false } } })}
          >
            <Story />
          </QueryProvider>
        </AppAdaptersProvider>
      );
    },
  ],
} satisfies Meta<typeof OwnPermissionsView>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Inherited: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Heredado del programa")).toBeVisible();
  },
};
export const Error: Story = {
  parameters: { permissionError: true },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("No se pudieron consultar sus permisos.")).toBeVisible();
  },
};
