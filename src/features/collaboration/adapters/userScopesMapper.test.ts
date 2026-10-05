// @vitest-environment node

import { describe, expect, it } from "vitest";

import { CollaborationMappingError, mapUserScope, mapUserScopesPage } from "./userScopesMapper";

const unit = { id: "fisc", name: "Facultad de Ingenieria de Sistemas", type: "FACULTY" };

const programScope = {
  eventProgram: null,
  id: "program-fisc-default",
  name: "Programa de Eventos de Ingenieria de Sistemas",
  organizationalUnit: unit,
  permissions: [
    { name: "program:read", origin: "LOCAL", validFrom: null, validUntil: null },
    {
      name: "report:export",
      origin: "INHERITED",
      validFrom: "2026-01-01T00:00:00.000Z",
      validUntil: "2026-12-31T23:59:59.000Z",
    },
  ],
  status: "ACTIVE",
  type: "program",
};

const activityScope = {
  eventProgram: {
    id: "program-fisc-default",
    label: "FISC",
    name: "Programa de Eventos de Ingenieria de Sistemas",
    status: "DRAFT",
  },
  id: "activity-open-data-governance",
  name: "Gobernanza de datos abiertos universitarios",
  organizationalUnit: unit,
  permissions: [{ name: "activity:read", origin: "BOTH", validFrom: null, validUntil: null }],
  status: "DRAFT",
  type: "activity",
};

describe("mapUserScope", () => {
  it("should map a program scope with a null parent program", () => {
    expect(mapUserScope(programScope)).toEqual(programScope);
  });

  it("should map an activity scope with its parent program", () => {
    expect(mapUserScope(activityScope)).toEqual(activityScope);
  });

  it("should keep non-public statuses discoverable", () => {
    expect(mapUserScope({ ...programScope, status: "ARCHIVED" }).status).toBe("ARCHIVED");
    expect(mapUserScope({ ...activityScope, status: "CANCELLED" }).status).toBe("CANCELLED");
  });

  it("should accept a free permission name and a nullable envelope", () => {
    const mapped = mapUserScope({
      ...programScope,
      permissions: [
        { name: "future:permission", origin: "LOCAL", validFrom: null, validUntil: null },
      ],
    });

    expect(mapped.permissions).toEqual([
      { name: "future:permission", origin: "LOCAL", validFrom: null, validUntil: null },
    ]);
  });

  it("should reject an unknown scope type", () => {
    expect(() => mapUserScope({ ...programScope, type: "event" })).toThrow(
      CollaborationMappingError,
    );
  });

  it("should reject an unknown status", () => {
    expect(() => mapUserScope({ ...programScope, status: "RESCHEDULED" })).toThrow(
      CollaborationMappingError,
    );
  });

  it("should reject an unknown permission origin", () => {
    expect(() =>
      mapUserScope({
        ...programScope,
        permissions: [
          { name: "program:read", origin: "GRANTED", validFrom: null, validUntil: null },
        ],
      }),
    ).toThrow(CollaborationMappingError);
  });

  it("should reject a malformed organizational unit", () => {
    expect(() =>
      mapUserScope({ ...programScope, organizationalUnit: { id: "fisc", name: "Sin tipo" } }),
    ).toThrow(CollaborationMappingError);
  });

  it("should reject a malformed parent program", () => {
    expect(() =>
      mapUserScope({
        ...activityScope,
        eventProgram: { id: "program-fisc-default", name: "Sin etiqueta" },
      }),
    ).toThrow(CollaborationMappingError);
  });

  it("should reject a missing required field", () => {
    const withoutName: Record<string, unknown> = { ...programScope };
    delete withoutName["name"];

    expect(() => mapUserScope(withoutName)).toThrow(CollaborationMappingError);
  });
});

describe("mapUserScopesPage", () => {
  it("should validate the envelope and keep the page metadata", () => {
    const payload = {
      data: { items: [programScope, activityScope], limit: 50, page: 2, total: 4, totalPages: 3 },
      message: "ok",
      success: true,
    };

    expect(mapUserScopesPage(payload)).toEqual({
      items: [programScope, activityScope],
      limit: 50,
      page: 2,
      total: 4,
      totalPages: 3,
    });
  });

  it("should accept an empty page", () => {
    const payload = {
      data: { items: [], limit: 50, page: 1, total: 0, totalPages: 0 },
      message: "ok",
      success: true,
    };

    expect(mapUserScopesPage(payload).items).toEqual([]);
  });

  it("should reject a failed envelope", () => {
    expect(() => mapUserScopesPage({ message: "error", success: false })).toThrow(
      CollaborationMappingError,
    );
  });

  it("should reject a malformed item in the page", () => {
    const payload = {
      data: {
        items: [{ ...programScope, type: "event" }],
        limit: 50,
        page: 1,
        total: 1,
        totalPages: 1,
      },
      message: "ok",
      success: true,
    };

    expect(() => mapUserScopesPage(payload)).toThrow(CollaborationMappingError);
  });
});
