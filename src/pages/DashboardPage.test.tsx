import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createAppAdapters } from "@/app/adapters";
import { createCatalog } from "@/test/factories";
import { renderWithProviders } from "@/test/render";

import { DashboardPage } from "./DashboardPage";

describe("DashboardPage", () => {
  it("should keep catalog metrics and warn when operations are unavailable", async () => {
    const adapters = createAppAdapters({ source: "mock" });

    renderWithProviders(<DashboardPage />, {
      adapters: {
        ...adapters,
        activityCatalog: { loadCatalog: vi.fn().mockResolvedValue(createCatalog()) },
        operations: { loadOperations: vi.fn().mockRejectedValue(new Error("sin contrato")) },
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
