// @vitest-environment node
import { describe, expect, it } from "vitest";
import { mapOwnPermissions } from "./ownPermissionsMapper";

const scope = { type: "activity" as const, id: "a-1" };
const permission = {
  name: "activity:read",
  origin: "INHERITED",
  validFrom: null,
  validUntil: null,
};
const payload = { success: true, message: "ok", data: { scope, permissions: [permission] } };

describe("mapOwnPermissions", () => {
  it("keeps contractual provenance without requiring canonical permission names", () => {
    expect(mapOwnPermissions(payload, scope).permissions).toEqual([permission]);
    expect(
      mapOwnPermissions(
        {
          ...payload,
          data: { scope, permissions: [{ ...permission, name: "future:permission" }] },
        },
        scope,
      ).permissions[0]?.name,
    ).toBe("future:permission");
  });
  it("rejects a response for a different scope", () => {
    expect(() => mapOwnPermissions(payload, { ...scope, id: "other" })).toThrow();
  });
  it.each([{ origin: "UNKNOWN" }, { validUntil: "not-a-date" }, { validFrom: undefined }])(
    "rejects malformed permissions %j",
    (change) => {
      expect(() =>
        mapOwnPermissions(
          { ...payload, data: { scope, permissions: [{ ...permission, ...change }] } },
          scope,
        ),
      ).toThrow();
    },
  );
  it("rejects an unsuccessful envelope", () => {
    expect(() => mapOwnPermissions({ ...payload, success: false }, scope)).toThrow();
  });
});
