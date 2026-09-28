import { describe, expect, it } from "vitest";

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

  it("should rotate a valid mock refresh token", async () => {
    const adapter = createMockAuthAdapter();
    const tokens = await adapter.login({ email: MOCK_AUTH_EMAIL, password: MOCK_AUTH_PASSWORD });

    await expect(adapter.refresh(tokens.refreshToken)).resolves.toMatchObject({
      tokenType: "Bearer",
    });
  });

  it("should reject an invalid refresh token with formal language", async () => {
    const adapter = createMockAuthAdapter();

    await expect(adapter.refresh("invalid-token")).rejects.toMatchObject({
      message: "Su sesion no esta autorizada.",
      status: 401,
    });
  });

  it("should verify an email with a non-empty token", async () => {
    const adapter = createMockAuthAdapter();

    await expect(adapter.verifyEmail("verify-token")).resolves.toBeUndefined();
  });

  it("should reject an empty verification token", async () => {
    const adapter = createMockAuthAdapter();

    await expect(adapter.verifyEmail("")).rejects.toMatchObject({ status: 400 });
  });
});
