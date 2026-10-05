// @vitest-environment node
import { expect, it } from "vitest";
import { createUserScope } from "@/test/factories";
import { hasScopeCapability, hasEffectivePermission } from "./operationalCapabilities";

it("requires both exact scope and explicit capability", () => {
  const scope = createUserScope({
    type: "activity",
    id: "a-1",
    permissions: [
      { name: "activity:read", origin: "INHERITED", validFrom: null, validUntil: null },
    ],
  });
  expect(hasScopeCapability([scope], { type: "activity", id: "a-1" }, "activity:read")).toBe(true);
  expect(hasScopeCapability([scope], { type: "activity", id: "a-2" }, "activity:read")).toBe(false);
  expect(hasScopeCapability([scope], { type: "program", id: "a-1" }, "activity:read")).toBe(false);
  expect(hasScopeCapability([scope], { type: "activity", id: "a-1" }, "permission:grant")).toBe(
    false,
  );
});
it("does not authorize expired, future or malformed windows", () => {
  const now = Date.parse("2026-10-04T12:00:00Z");
  const permission = {
    name: "activity:read",
    origin: "LOCAL" as const,
    validFrom: null,
    validUntil: "2026-10-04T12:00:00Z",
  };
  expect(hasEffectivePermission([permission], "activity:read", now)).toBe(false);
  expect(
    hasEffectivePermission(
      [{ ...permission, validUntil: null, validFrom: "2026-10-05T00:00:00Z" }],
      "activity:read",
      now,
    ),
  ).toBe(false);
  expect(hasEffectivePermission([{ ...permission, validUntil: "bad" }], "activity:read", now)).toBe(
    false,
  );
  expect(
    hasEffectivePermission(
      [{ ...permission, validUntil: null, name: "unknown:permission" }],
      "activity:read",
      now,
    ),
  ).toBe(false);
});
