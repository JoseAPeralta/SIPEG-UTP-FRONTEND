import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type RegistrationAdapter } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import { useUnitPreferenceStore } from "@/store/unitPreference";
import { useWorkingContextStore } from "@/store/workingContext";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import type { RegistrationCatalog } from "@/types/domain";

import { ProfilePage } from "./ProfilePage";

const catalog: RegistrationCatalog = {
  careers: [{ code: "SOFTWARE", id: "software", name: "Desarrollo de Software", unitId: "fisc" }],
  organizationalUnits: [
    {
      code: "FISC",
      description: null,
      head: null,
      id: "fisc",
      isActive: true,
      name: "Facultad de Ingenieria de Sistemas",
      type: "FACULTY",
    },
  ],
};

function createRegistrationSpy(overrides: Partial<RegistrationAdapter> = {}): RegistrationAdapter {
  return {
    loadCatalog: vi.fn().mockResolvedValue(catalog),
    register: vi.fn(),
    ...overrides,
  };
}

function createAdapters(registration: RegistrationAdapter = createRegistrationSpy()) {
  return { ...createAppAdapters({ source: "mock" }), registration };
}

function authenticateSession() {
  const tokens = createAuthTokens();
  useSessionStore
    .getState()
    .setSession({ currentUser: createAuthenticatedUser({ globalRole: "USER" }), tokens });

  return tokens;
}

describe("ProfilePage", () => {
  beforeEach(() => {
    useSessionStore.getState().clearSession();
    useUnitPreferenceStore.getState().setSelectedUnitId("all");
    useWorkingContextStore.getState().clearWorkingContext();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("should show only the editable account data", async () => {
    authenticateSession();
    renderWithProviders(<ProfilePage />, { route: "/perfil/datos" });

    expect(await screen.findByLabelText(/^nombre$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /mantenga sus datos al d[ií]a/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /cambiar contrase[nñ]a/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /mis actividades/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /mis certificados/i })).not.toBeInTheDocument();
  });

  it("should not render the route heading, which belongs to the personal area layout", () => {
    authenticateSession();
    renderWithProviders(<ProfilePage />, { route: "/perfil/datos" });

    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });

  it("should report a catalog failure inside the data section", async () => {
    authenticateSession();
    const registration = createRegistrationSpy({
      loadCatalog: vi.fn().mockRejectedValue(new Error("catalog unavailable")),
    });

    renderWithProviders(<ProfilePage />, {
      adapters: createAdapters(registration),
      route: "/perfil/datos",
    });

    expect(await screen.findByRole("button", { name: /reintentar/i })).toBeInTheDocument();
  });

  it("should never render the session credentials in the data section", () => {
    const tokens = authenticateSession();
    const { container } = renderWithProviders(<ProfilePage />, { route: "/perfil/datos" });

    expect(container.innerHTML).not.toContain(tokens.accessToken);
    expect(container.innerHTML).not.toContain(tokens.accessToken);
    expect(sessionStorage.length).toBe(0);
  });
});
