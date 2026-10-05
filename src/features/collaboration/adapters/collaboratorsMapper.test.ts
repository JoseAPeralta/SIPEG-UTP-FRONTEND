// @vitest-environment node
import { expect, it } from "vitest";
import { mapCollaborator, mapCollaborators } from "./collaboratorsMapper";
const permission = {
  name: "activity:read",
  source: "ROLE_DEFAULT",
  origin: "INHERITED",
  effective: true,
  validFrom: null,
  validUntil: null,
};
const collaborator = {
  userId: "u-1",
  firstName: "Ana",
  lastName: "Pérez",
  email: "ana@example.test",
  role: "VIEWER",
  createdAt: "2026-01-01T00:00:00Z",
  permissions: [permission],
};
it("keeps effective provenance from listings", () => {
  expect(
    mapCollaborators({ success: true, message: "ok", data: { items: [collaborator] } })[0]
      ?.permissions,
  ).toEqual([permission]);
});
it("requires provenance for listings but not mutations", () => {
  const { origin: _origin, effective: _effective, ...local } = permission;
  void _origin;
  void _effective;
  const mutation = { ...collaborator, permissions: [local] };
  expect(mapCollaborator({ success: true, message: "ok", data: mutation })).toEqual(mutation);
  expect(() =>
    mapCollaborators({ success: true, message: "ok", data: { items: [mutation] } }),
  ).toThrow();
});
it.each([
  { role: "SUPERUSER" },
  { createdAt: "bad" },
  { permissions: [{ ...permission, effective: "yes" }] },
])("rejects malformed collaborators %j", (change) => {
  expect(() =>
    mapCollaborators({
      success: true,
      message: "ok",
      data: { items: [{ ...collaborator, ...change }] },
    }),
  ).toThrow();
});
