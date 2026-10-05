import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import {
  createActivityCatalogPayload,
  createAuthenticatedUser,
  createAuthTokens,
  createClassroom,
  createOrganizationalUnit,
} from "@/test/factories";
import { renderWithProviders } from "@/test/render";

import { DashboardPage } from "./DashboardPage";

describe("DashboardPage", () => {
  beforeEach(() => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens(),
    });
  });

  afterEach(() => {
    useSessionStore.getState().clearSession();
  });

  it("should keep catalog metrics and warn when operations are unavailable", async () => {
    const adapters = createAppAdapters({ source: "mock" });

    renderWithProviders(<DashboardPage />, {
      adapters: {
        ...adapters,
        activityCatalog: { loadCatalog: vi.fn().mockResolvedValue(createActivityCatalogPayload()) },
        classrooms: { loadClassrooms: vi.fn().mockResolvedValue([createClassroom()]) },
        operations: { loadOperations: vi.fn().mockRejectedValue(new Error("sin contrato")) },
        organizationalUnits: {
          loadOrganizationalUnits: vi.fn().mockResolvedValue([createOrganizationalUnit()]),
        },
      },
    });

    expect(
      await screen.findByRole("heading", { level: 1, name: /panel operativo sipeg/i }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /asistencia y certificados no estan disponibles/i,
    );
    expect(screen.getAllByText("—")).toHaveLength(2);
    expect(screen.getByText("Actividades")).toBeInTheDocument();
  });
});
