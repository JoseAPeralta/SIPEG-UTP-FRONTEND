import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { renderWithProviders } from "@/test/render";

import { PersonalCertificatesPage } from "./PersonalCertificatesPage";

describe("PersonalCertificatesPage", () => {
  beforeEach(() => {
    useSessionStore.getState().clearSession();
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "USER" }),
      tokens: createAuthTokens(),
    });
  });

  it("should announce the section as a pending service", () => {
    renderWithProviders(<PersonalCertificatesPage />, { route: "/perfil/certificados" });

    expect(screen.getByRole("heading", { level: 2, name: /próximamente/i })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/certificados/i);
  });

  it("should not offer a control that leads nowhere", () => {
    renderWithProviders(<PersonalCertificatesPage />, { route: "/perfil/certificados" });

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
