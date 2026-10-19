// @vitest-environment node
import { expect, it, vi } from "vitest";
import { createMockCollaboratorsAdapter } from "./mockCollaboratorsAdapter";

const scope = { type: "program" as const, id: "program-fisc-default" };
const person = {
  userId: "user-2",
  firstName: "Carlos",
  lastName: "Mendez",
  email: "carlos@example.test",
  role: "ORGANIZER" as const,
  createdAt: "2026-01-01T00:00:00Z",
  permissions: [
    {
      name: "permission:grant",
      source: "OVERRIDE" as const,
      origin: "LOCAL" as const,
      effective: true,
      validFrom: null,
      validUntil: null,
    },
  ],
};
it("rejects removal of the last delegator", async () => {
  const adapter = createMockCollaboratorsAdapter({
    initial: [{ scope, collaborators: [person] }],
    actor: { isAdmin: false, permissions: ["permission:grant"] },
  });
  await expect(adapter.removeCollaborator(scope, person.userId)).rejects.toMatchObject({
    status: 409,
  });
  expect(await adapter.loadCollaborators(scope)).toHaveLength(1);
});
it("keeps the last-delegator safeguard even for an administrator actor", async () => {
  const adapter = createMockCollaboratorsAdapter({ initial: [{ scope, collaborators: [person] }] });
  await expect(adapter.removeCollaborator(scope, person.userId)).rejects.toMatchObject({
    status: 409,
  });
});
it("preserves direct grants across a role change", async () => {
  const adapter = createMockCollaboratorsAdapter({ initial: [{ scope, collaborators: [person] }] });
  const changed = await adapter.changeCollaboratorRole(scope, person.userId, { role: "VIEWER" });
  expect(changed.permissions).toContainEqual(
    expect.objectContaining({ name: "permission:grant", source: "OVERRIDE" }),
  );
});
it("enforces explicit scenario grants without inventing a role matrix", async () => {
  const adapter = createMockCollaboratorsAdapter({
    actor: { isAdmin: false, permissions: ["permission:grant"] },
    roleGrants: { EDITOR: ["activity:update"] },
  });
  await expect(
    adapter.addCollaborator(scope, { userId: "user-3", role: "EDITOR" }),
  ).rejects.toMatchObject({ status: 403 });
});

const combined = {
  ...person,
  permissions: [
    ...person.permissions,
    {
      name: "activity:read",
      source: "ROLE_DEFAULT" as const,
      origin: "INHERITED" as const,
      effective: true,
      validFrom: null,
      validUntil: null,
    },
  ],
};

it("creates overrides, replaces their window and marks combined provenance", async () => {
  const adapter = createMockCollaboratorsAdapter({
    initial: [{ scope, collaborators: [combined] }],
  });
  await adapter.grantPermission(scope, {
    userId: combined.userId,
    permission: "program:read",
    validFrom: null,
    validUntil: "2027-01-01T00:00:00Z",
  });
  const granted = await adapter.grantPermission(scope, {
    userId: combined.userId,
    permission: "activity:read",
    validFrom: "2026-10-06T00:00:00Z",
    validUntil: "2027-01-01T00:00:00Z",
  });
  expect(granted.permissions).toEqual([
    expect.objectContaining({ name: "permission:grant", source: "OVERRIDE" }),
    expect.objectContaining({ name: "program:read", source: "OVERRIDE" }),
    expect.objectContaining({
      name: "activity:read",
      source: "OVERRIDE",
      validFrom: "2026-10-06T00:00:00Z",
      validUntil: "2027-01-01T00:00:00Z",
    }),
  ]);
  const listed = (await adapter.loadCollaborators(scope))[0]!;
  expect(listed.permissions).toContainEqual(
    expect.objectContaining({ name: "activity:read", origin: "BOTH", effective: true }),
  );
});

it("revokes the local half and keeps inheritance, rejecting inherited-only changes", async () => {
  const adapter = createMockCollaboratorsAdapter({
    initial: [{ scope, collaborators: [combined] }],
  });
  await adapter.grantPermission(scope, {
    userId: combined.userId,
    permission: "activity:read",
    validFrom: null,
    validUntil: "2027-01-01T00:00:00Z",
  });
  await adapter.revokePermission(scope, {
    userId: combined.userId,
    permission: "activity:read",
  });
  const listed = (await adapter.loadCollaborators(scope))[0]!;
  expect(listed.permissions).toContainEqual(
    expect.objectContaining({ name: "activity:read", origin: "INHERITED", source: "ROLE_DEFAULT" }),
  );
  await expect(
    adapter.revokePermission(scope, { userId: combined.userId, permission: "activity:read" }),
  ).rejects.toMatchObject({ status: 409 });
});

it("protects the last delegator when a revoke removes permission:grant", async () => {
  const adapter = createMockCollaboratorsAdapter({
    initial: [{ scope, collaborators: [person] }],
  });
  await expect(
    adapter.revokePermission(scope, { userId: person.userId, permission: "permission:grant" }),
  ).rejects.toMatchObject({ status: 409 });
  const listed = (await adapter.loadCollaborators(scope))[0]!;
  expect(listed.permissions).toContainEqual(expect.objectContaining({ name: "permission:grant" }));
});

it("requires the actor to hold the permission it grants or revokes", async () => {
  const adapter = createMockCollaboratorsAdapter({
    initial: [{ scope, collaborators: [person] }],
    actor: { isAdmin: false, permissions: ["permission:grant"] },
  });
  await expect(
    adapter.grantPermission(scope, {
      userId: person.userId,
      permission: "activity:update",
      validFrom: null,
      validUntil: null,
    }),
  ).rejects.toMatchObject({ status: 403 });
});

it("rejects grants for people who are not collaborators", async () => {
  const adapter = createMockCollaboratorsAdapter({
    initial: [{ scope, collaborators: [person] }],
  });
  await expect(
    adapter.grantPermission(scope, {
      userId: "user-404",
      permission: "activity:update",
      validFrom: null,
      validUntil: null,
    }),
  ).rejects.toMatchObject({ status: 404 });
});

const runtimeScope = { type: "program" as const, id: "program-created-in-runtime" };
const unknownScope = { type: "program" as const, id: "program-unknown" };

it("honors an archived state reported by the composition reader", async () => {
  const adapter = createMockCollaboratorsAdapter({ readProgramState: () => "ARCHIVED" });

  await expect(adapter.loadCollaborators(scope)).resolves.toBeTruthy();
  await expect(
    adapter.addCollaborator(scope, { userId: "user-2", role: "EDITOR" }),
  ).rejects.toMatchObject({ status: 409 });
  await expect(
    adapter.changeCollaboratorRole(scope, "user-1", { role: "VIEWER" }),
  ).rejects.toMatchObject({ status: 409 });
  await expect(adapter.removeCollaborator(scope, "user-1")).rejects.toMatchObject({ status: 409 });
  await expect(
    adapter.grantPermission(scope, {
      userId: "user-1",
      permission: "activity:read",
      validFrom: null,
      validUntil: null,
    }),
  ).rejects.toMatchObject({ status: 409 });
});

it("accepts programs that only exist in the composition", async () => {
  const adapter = createMockCollaboratorsAdapter({ readProgramState: () => "ACTIVE" });

  await expect(adapter.loadCollaborators(runtimeScope)).resolves.toEqual([]);
  await expect(
    adapter.addCollaborator(runtimeScope, { userId: "user-2", role: "EDITOR" }),
  ).resolves.toMatchObject({ userId: "user-2" });
});

it("derives the program of an activity scope for the composition reader", async () => {
  const readProgramState = vi.fn((programId: string) =>
    programId === "program-innovation-week" ? ("ARCHIVED" as const) : null,
  );
  const adapter = createMockCollaboratorsAdapter({ readProgramState });

  await expect(
    adapter.addCollaborator(
      { type: "activity", id: "activity-open-data-governance" },
      { userId: "user-2", role: "EDITOR" },
    ),
  ).rejects.toMatchObject({ status: 409 });
  expect(readProgramState).toHaveBeenCalledWith("program-innovation-week");
});

it("still rejects a program absent from the fixture without a reader", async () => {
  const adapter = createMockCollaboratorsAdapter();

  await expect(adapter.loadCollaborators(unknownScope)).rejects.toMatchObject({ status: 404 });
});

const deletedActivityScope = { type: "activity" as const, id: "activity-open-data-governance" };

it("treats a deleted activity as a missing resource even with a fixture entry", async () => {
  const adapter = createMockCollaboratorsAdapter({
    initial: [{ scope: deletedActivityScope, collaborators: [person] }],
    readActivityProgramId: () => undefined,
  });

  await expect(adapter.loadCollaborators(deletedActivityScope)).rejects.toMatchObject({
    status: 404,
  });
});

it("resolves an activity that only exists in the composition", async () => {
  const runtimeActivityScope = { type: "activity" as const, id: "activity-runtime" };
  const adapter = createMockCollaboratorsAdapter({
    readActivityProgramId: (activityId) =>
      activityId === "activity-runtime" ? "program-created" : undefined,
    readProgramState: () => "ACTIVE",
  });

  await expect(adapter.loadCollaborators(runtimeActivityScope)).resolves.toEqual([]);
});
