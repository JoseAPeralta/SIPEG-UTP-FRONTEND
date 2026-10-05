import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { renderWithProviders } from "@/test/render";

import { PersonalActivitiesPage } from "./PersonalActivitiesPage";

describe("PersonalActivitiesPage", () => {
  beforeEach(() => {
    useSessionStore.getState().clearSession();
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "USER" }),
      tokens: createAuthTokens(),
    });
  });

  it("should announce the section as a pending service", () => {
    renderWithProviders(<PersonalActivitiesPage />, { route: "/perfil/actividades" });

    expect(screen.getByRole("heading", { level: 2, name: /próximamente/i })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/inscripciones/i);
  });

  it("should not offer a control that leads nowhere", () => {
    renderWithProviders(<PersonalActivitiesPage />, { route: "/perfil/actividades" });

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
