import { describe, expect, it } from "vitest";

import type { ProfileUpdateRequest } from "@/app/adapters/contracts";
import { mockAuthTokens } from "@/data/mock/auth";

import { createMockAuthAdapter, MOCK_AUTH_EMAIL, MOCK_AUTH_PASSWORD } from "./mockAuthAdapter";

describe("createMockAuthAdapter", () => {
  it("should authenticate the documented mock account", async () => {
    const adapter = createMockAuthAdapter();
    const tokens = await adapter.login({ email: MOCK_AUTH_EMAIL, password: MOCK_AUTH_PASSWORD });

    await expect(adapter.loadCurrentUser(tokens.accessToken)).resolves.toMatchObject({
      email: MOCK_AUTH_EMAIL,
      globalRole: "ADMIN",
    });
  });

  it("should reject invalid mock credentials", async () => {
    const adapter = createMockAuthAdapter();

    await expect(
      adapter.login({ email: "unknown@example.edu", password: "incorrect" }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("should reject an invalid access token with formal language", async () => {
    const adapter = createMockAuthAdapter();

    await expect(adapter.loadCurrentUser("invalid-token")).rejects.toMatchObject({
      message: "Su sesion no esta autorizada.",
      status: 401,
    });
  });

  it("should renew the session without a refresh token argument", async () => {
    const adapter = createMockAuthAdapter();
    await adapter.login({ email: MOCK_AUTH_EMAIL, password: MOCK_AUTH_PASSWORD });

    // La cookie es la que autoriza y no se puede pasar ni leer desde aqui, igual
    // que con el adaptador real.
    await expect(adapter.refresh()).resolves.toMatchObject({ tokenType: "Bearer" });
  });

  it("should verify an email with a non-empty token", async () => {
    const adapter = createMockAuthAdapter();

    await expect(adapter.verifyEmail("verify-token")).resolves.toBeUndefined();
  });

  it("should reject an empty verification token", async () => {
    const adapter = createMockAuthAdapter();

    await expect(adapter.verifyEmail("")).rejects.toMatchObject({ status: 400 });
  });

  it("should acknowledge a password reset request for any contract email", async () => {
    const adapter = createMockAuthAdapter();

    await expect(
      adapter.requestPasswordReset({ email: "desconocido@example.edu" }),
    ).resolves.toBeUndefined();
  });

  it("should acknowledge a password reset request for the known account too", async () => {
    const adapter = createMockAuthAdapter();

    await expect(adapter.requestPasswordReset({ email: MOCK_AUTH_EMAIL })).resolves.toBeUndefined();
  });

  it("should reject a malformed password reset request", async () => {
    const adapter = createMockAuthAdapter();

    await expect(adapter.requestPasswordReset({ email: "no-es-correo" })).rejects.toMatchObject({
      status: 400,
    });
  });

  it("should reset a mock password with a non-empty token", async () => {
    const adapter = createMockAuthAdapter();

    await expect(
      adapter.resetPassword({ newPassword: "Nueva clave 2026", token: "reset-token" }),
    ).resolves.toBeUndefined();
  });

  it("should reject an empty reset token", async () => {
    const adapter = createMockAuthAdapter();

    await expect(
      adapter.resetPassword({ newPassword: "Nueva clave 2026", token: "  " }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("should reject a reset password shorter than the minimum", async () => {
    const adapter = createMockAuthAdapter();

    await expect(
      adapter.resetPassword({ newPassword: "a".repeat(11), token: "reset-token" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("should reject a reset password longer than the product maximum", async () => {
    const adapter = createMockAuthAdapter();

    await expect(
      adapter.resetPassword({ newPassword: "a".repeat(21), token: "reset-token" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("should change the mock password for the documented session", async () => {
    const adapter = createMockAuthAdapter();

    await expect(
      adapter.changePassword(mockAuthTokens.accessToken, {
        currentPassword: MOCK_AUTH_PASSWORD,
        newPassword: "Nueva clave 2026",
      }),
    ).resolves.toBeUndefined();
  });

  it("should reject a password change with a wrong current password", async () => {
    const adapter = createMockAuthAdapter();

    await expect(
      adapter.changePassword(mockAuthTokens.accessToken, {
        currentPassword: "Otra clave 2026",
        newPassword: "Nueva clave 2026",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("should reject a password change with an unauthorized access token", async () => {
    const adapter = createMockAuthAdapter();

    await expect(
      adapter.changePassword("otro-access-token", {
        currentPassword: MOCK_AUTH_PASSWORD,
        newPassword: "Nueva clave 2026",
      }),
    ).rejects.toMatchObject({ status: 401 });
  });

  // La comprobacion "el refresh token pertenece a este usuario" ya no puede vivir
  // en el mock: la credencial llega en una cookie HttpOnly que el adaptador no
  // lee. La verifica el backend filtrando por `userId`, con tests en
  // `auth.service.test.ts`.

  it("should reject a new password outside the product limits", async () => {
    const adapter = createMockAuthAdapter();

    await expect(
      adapter.changePassword(mockAuthTokens.accessToken, {
        currentPassword: MOCK_AUTH_PASSWORD,
        newPassword: "a".repeat(21),
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("should authenticate with the new password and reject the previous one", async () => {
    const adapter = createMockAuthAdapter();

    await adapter.changePassword(mockAuthTokens.accessToken, {
      currentPassword: MOCK_AUTH_PASSWORD,
      newPassword: "Nueva clave 2026",
    });

    await expect(
      adapter.login({ email: MOCK_AUTH_EMAIL, password: "Nueva clave 2026" }),
    ).resolves.toMatchObject({ tokenType: "Bearer" });
    await expect(
      adapter.login({ email: MOCK_AUTH_EMAIL, password: MOCK_AUTH_PASSWORD }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("should not share the changed password between adapter instances", async () => {
    const firstAdapter = createMockAuthAdapter();
    const secondAdapter = createMockAuthAdapter();

    await firstAdapter.changePassword(mockAuthTokens.accessToken, {
      currentPassword: MOCK_AUTH_PASSWORD,
      newPassword: "Nueva clave 2026",
    });

    await expect(
      secondAdapter.login({ email: MOCK_AUTH_EMAIL, password: MOCK_AUTH_PASSWORD }),
    ).resolves.toMatchObject({ tokenType: "Bearer" });
  });

  it("should update the mock profile names for the documented session", async () => {
    const adapter = createMockAuthAdapter();

    await expect(
      adapter.updateCurrentUser(mockAuthTokens.accessToken, {
        firstName: "Mariana Paula",
        lastName: "Rodriguez Vega",
      }),
    ).resolves.toMatchObject({ firstName: "Mariana Paula", lastName: "Rodriguez Vega" });

    await expect(adapter.loadCurrentUser(mockAuthTokens.accessToken)).resolves.toMatchObject({
      firstName: "Mariana Paula",
      lastName: "Rodriguez Vega",
    });
  });

  it("should move the mock profile to another unit and career", async () => {
    const adapter = createMockAuthAdapter();

    await expect(
      adapter.updateCurrentUser(mockAuthTokens.accessToken, {
        careerId: "civil",
        unitId: "fic",
      }),
    ).resolves.toMatchObject({
      career: { code: "CIVIL", id: "civil", name: "Ingenieria Civil" },
      unit: { code: "FIC", id: "fic" },
    });
  });

  it("should force the global Otros career when the mock unit is Otro", async () => {
    const adapter = createMockAuthAdapter();

    const profile = await adapter.updateCurrentUser(mockAuthTokens.accessToken, { unitId: null });

    expect(profile.unit).toBeNull();
    expect(profile.career).toMatchObject({ code: "OTROS", id: "otros", name: "Otros" });
  });

  it("should reject a mock profile update with an unauthorized access token", async () => {
    const adapter = createMockAuthAdapter();

    await expect(
      adapter.updateCurrentUser("otro-access-token", { firstName: "Mariana Paula" }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("should reject a mock profile update with an unknown unit", async () => {
    const adapter = createMockAuthAdapter();

    await expect(
      adapter.updateCurrentUser(mockAuthTokens.accessToken, { unitId: "unidad-inexistente" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("should reject a mock profile update with a career from another unit", async () => {
    const adapter = createMockAuthAdapter();

    await expect(
      adapter.updateCurrentUser(mockAuthTokens.accessToken, {
        careerId: "mechanical",
        unitId: "fic",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("should reject a mock profile update with an unknown career", async () => {
    const adapter = createMockAuthAdapter();

    await expect(
      adapter.updateCurrentUser(mockAuthTokens.accessToken, { careerId: "carrera-inexistente" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("should ignore server-controlled fields injected at runtime in the mock", async () => {
    const adapter = createMockAuthAdapter();

    const profile = await adapter.updateCurrentUser(mockAuthTokens.accessToken, {
      email: "attacker@example.com",
      firstName: "Mariana Paula",
      globalRole: "ADMIN",
      id: "user-2",
      identificationNumber: "8-999-9999",
      isActive: false,
    } as ProfileUpdateRequest);

    expect(profile).toMatchObject({
      email: MOCK_AUTH_EMAIL,
      firstName: "Mariana Paula",
      globalRole: "ADMIN",
      id: "user-1",
      identificationNumber: "8-000-0001",
    });
  });

  it("should not share the updated mock profile between adapter instances", async () => {
    const firstAdapter = createMockAuthAdapter();
    const secondAdapter = createMockAuthAdapter();

    await firstAdapter.updateCurrentUser(mockAuthTokens.accessToken, {
      firstName: "Mariana Paula",
    });

    await expect(secondAdapter.loadCurrentUser(mockAuthTokens.accessToken)).resolves.toMatchObject({
      firstName: "Mariana",
    });
  });
});
