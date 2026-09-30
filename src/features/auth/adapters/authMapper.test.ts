import { describe, expect, it } from "vitest";

import {
  mapAuthenticatedUser,
  mapAuthTokens,
  readAuthEnvelopeData,
  readEmptySuccessData,
} from "./authMapper";

const tokenPayload = {
  accessToken: "access-token",
  accessTokenExpiresAt: "2026-09-26T12:00:00.000Z",
  refreshTokenExpiresAt: "2026-10-03T12:00:00.000Z",
  tokenType: "Bearer",
};

const profilePayload = {
  career: { code: "SOFTWARE", id: "career-1", name: "Desarrollo de Software" },
  email: "admin@example.edu",
  firstName: "Mariana",
  globalRole: "ADMIN",
  id: "user-1",
  identificationNumber: "8-123-456",
  lastName: "Rodriguez",
  unit: { code: "FISC", id: "unit-1", name: "Facultad de Sistemas" },
};

describe("authMapper", () => {
  it("should map a valid token pair", () => {
    expect(mapAuthTokens(tokenPayload, "auth.login.data")).toEqual(tokenPayload);
  });

  it("should reject a token pair outside the contract", () => {
    expect(() => mapAuthTokens({ ...tokenPayload, tokenType: "Basic" }, "auth.login.data")).toThrow(
      /tokenType/,
    );
  });

  it("should map the authenticated profile with organization references", () => {
    expect(mapAuthenticatedUser(profilePayload, "users.me.data")).toEqual(profilePayload);
  });

  it("should accept nullable unit and career references", () => {
    expect(
      mapAuthenticatedUser({ ...profilePayload, career: null, unit: null }, "users.me.data"),
    ).toMatchObject({ career: null, unit: null });
  });

  it("should reject profile roles outside the contract", () => {
    expect(() =>
      mapAuthenticatedUser({ ...profilePayload, globalRole: "OWNER" }, "users.me.data"),
    ).toThrow(/globalRole/);
  });

  it("should read successful API envelopes", () => {
    expect(
      readAuthEnvelopeData(
        { data: tokenPayload, message: "Autenticado", success: true },
        "auth.login",
      ),
    ).toEqual(tokenPayload);
  });

  it("should reject malformed API envelopes", () => {
    expect(() => readAuthEnvelopeData({ data: tokenPayload }, "auth.login")).toThrow(/success/);
  });

  it("should accept an empty successful payload", () => {
    expect(
      readEmptySuccessData({ data: {}, message: "ok", success: true }, "auth.forgotPassword"),
    ).toBeUndefined();
  });

  it("should reject a successful payload that is not empty", () => {
    expect(() =>
      readEmptySuccessData(
        { data: { token: "leaked" }, message: "ok", success: true },
        "auth.resetPassword",
      ),
    ).toThrow(/auth\.resetPassword\.data/);
  });

  it("should reject an empty successful payload that is not an object", () => {
    expect(() =>
      readEmptySuccessData({ data: null, message: "ok", success: true }, "auth.forgotPassword"),
    ).toThrow(/auth\.forgotPassword\.data/);
  });
});
