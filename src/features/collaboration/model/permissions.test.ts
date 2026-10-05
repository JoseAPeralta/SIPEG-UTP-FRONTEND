// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  COLLABORATION_ROLES,
  PERMISSION_NAMES,
  UNKNOWN_COLLABORATION_ROLE_LABEL,
  UNKNOWN_PERMISSION_LABEL,
  collaborationRoleLabels,
  isCollaborationRole,
  isPermissionName,
  permissionLabels,
  resolveCollaborationRoleLabel,
  resolvePermissionLabel,
} from "./permissions";

const EXPECTED_ROLES = ["VIEWER", "EDITOR", "ORGANIZER"];

const EXPECTED_PERMISSIONS = [
  "program:read",
  "program:create",
  "program:update",
  "program:archive",
  "program:reactivate",
  "activity:read",
  "activity:create",
  "activity:update",
  "activity:cancel",
  "activity:delete",
  "attendance:register",
  "attendance:checkin",
  "attendance:manage",
  "certificate:read",
  "certificate:generate",
  "proposal:read",
  "proposal:review",
  "proposal:feedback",
  "report:view",
  "report:export",
  "permission:grant",
];

describe("collaboration permissions model", () => {
  it("should expose exactly the contractual collaboration roles", () => {
    expect([...COLLABORATION_ROLES]).toEqual(EXPECTED_ROLES);
  });

  it("should expose exactly the canonical permission catalog without duplicates", () => {
    expect([...PERMISSION_NAMES]).toEqual(EXPECTED_PERMISSIONS);
    expect(new Set(PERMISSION_NAMES).size).toBe(PERMISSION_NAMES.length);
  });

  it("should label every role and permission in Spanish without echoing the code", () => {
    expect(Object.keys(collaborationRoleLabels).sort()).toEqual([...EXPECTED_ROLES].sort());
    expect(Object.keys(permissionLabels).sort()).toEqual([...EXPECTED_PERMISSIONS].sort());

    for (const [code, label] of Object.entries(collaborationRoleLabels)) {
      expect(label.trim(), `${code} debe tener etiqueta`).not.toBe("");
      expect(label, `${code} no debe mostrar el codigo`).not.toBe(code);
    }

    for (const [code, label] of Object.entries(permissionLabels)) {
      expect(label.trim(), `${code} debe tener etiqueta`).not.toBe("");
      expect(label, `${code} no debe mostrar el codigo`).not.toBe(code);
    }
  });

  it("should resolve known labels from their codes", () => {
    expect(resolveCollaborationRoleLabel("ORGANIZER")).toBe(collaborationRoleLabels.ORGANIZER);
    expect(resolvePermissionLabel("activity:update")).toBe(permissionLabels["activity:update"]);
  });

  it("should fall back to a localized label for unknown codes without echoing the raw value", () => {
    expect(resolveCollaborationRoleLabel("SUPERADMIN")).toBe(UNKNOWN_COLLABORATION_ROLE_LABEL);
    expect(resolvePermissionLabel("activity:teleport")).toBe(UNKNOWN_PERMISSION_LABEL);
    expect(UNKNOWN_COLLABORATION_ROLE_LABEL).not.toContain("SUPERADMIN");
    expect(UNKNOWN_PERMISSION_LABEL).not.toContain("activity:teleport");
  });

  it("should identify valid roles and permissions", () => {
    expect(isCollaborationRole("VIEWER")).toBe(true);
    expect(isCollaborationRole("SUPERADMIN")).toBe(false);
    expect(isCollaborationRole(null)).toBe(false);
    expect(isCollaborationRole(42)).toBe(false);

    expect(isPermissionName("activity:read")).toBe(true);
    expect(isPermissionName("activity:teleport")).toBe(false);
    expect(isPermissionName(undefined)).toBe(false);
    expect(isPermissionName({})).toBe(false);
  });
});
