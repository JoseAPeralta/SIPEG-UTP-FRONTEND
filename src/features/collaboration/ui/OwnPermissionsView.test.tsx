import { screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { createAppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import { OwnPermissionsView } from "./OwnPermissionsView";

afterEach(() => useSessionStore.getState().clearSession());
it("does not expose service errors", async () => {
  useSessionStore
    .getState()
    .setSession({ currentUser: createAuthenticatedUser(), tokens: createAuthTokens() });
  renderWithProviders(<OwnPermissionsView scope={{ type: "activity", id: "a" }} />, {
    adapters: {
      ...createAppAdapters({ source: "mock" }),
      ownPermissions: {
        loadOwnPermissions: vi.fn().mockRejectedValue(new Error("internal_secret")),
      },
    },
  });
  expect(await screen.findByText("No se pudieron consultar sus permisos.")).toBeInTheDocument();
  expect(screen.queryByText("internal_secret")).not.toBeInTheDocument();
});
