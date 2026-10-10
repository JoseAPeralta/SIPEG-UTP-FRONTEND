import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

import { CONTRACT_EXPECTATIONS, compareContract, parseSource } from "./check-mock-contract.mjs";

const execFileAsync = promisify(execFile);
const scriptPath = join(import.meta.dirname, "check-mock-contract.mjs");
const tempDirectories = [];

afterEach(async () => {
  await Promise.all(
    tempDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

async function writeDocument(document) {
  const directory = await mkdtemp(join(tmpdir(), "sipeg-mock-contract-"));
  tempDirectories.push(directory);
  const file = join(directory, "openapi.json");
  await writeFile(file, JSON.stringify(document));

  return file;
}

function buildDocument(expectations = CONTRACT_EXPECTATIONS) {
  const schemas = {};
  const paths = {};

  for (const expectation of expectations) {
    const operation = {
      responses: {
        200: {
          content: { "application/json": { schema: {} } },
          description: "ok",
        },
      },
      summary: "Fixture",
    };

    if (expectation.schema) {
      const properties = Object.fromEntries(
        (expectation.required ?? []).map((field) => [field, { type: "string" }]),
      );
      for (const [field, values] of Object.entries(expectation.enums ?? {})) {
        properties[field] = { enum: [...values], type: "string" };
      }

      schemas[expectation.schema] = {
        properties,
        required: [...(expectation.required ?? [])],
        type: "object",
      };
      operation.responses[200].content["application/json"].schema = {
        $ref: `#/components/schemas/${expectation.schema}`,
      };
    }

    if (expectation.requestBody && typeof expectation.requestBody === "object") {
      const properties = {};
      for (const [field, values] of Object.entries(expectation.requestBody.enums ?? {})) {
        properties[field] = { enum: [...values], type: "string" };
      }
      const schema = { properties, type: "object" };
      if (expectation.requestBody.additionalProperties !== undefined) {
        schema.additionalProperties = expectation.requestBody.additionalProperties;
      }
      operation.requestBody = {
        content: { "application/json": { schema } },
        required: true,
      };
    }

    if (expectation.response) {
      operation.responses[expectation.response.status] =
        expectation.response.content === "absent"
          ? { description: "sin contenido" }
          : { content: { "application/json": { schema: {} } }, description: "ok" };
    }

    // Varias operaciones comparten path (por ejemplo el listado y el alta de aulas), asi que el
    // metodo se acumula en el mismo item en lugar de reemplazarlo.
    const pathItem = (paths[expectation.path] ??= {});
    const method = expectation.method.toLowerCase();
    pathItem[method] = { ...pathItem[method], ...operation };
  }

  return {
    components: { schemas },
    info: { title: "fixture", version: "1.0.0" },
    openapi: "3.1.0",
    paths,
  };
}

describe("compareContract", () => {
  it("should track the classroom availability summary contract", () => {
    expect(CONTRACT_EXPECTATIONS).toContainEqual({
      enums: { type: ["LABORATORY", "CLASSROOM", "CONFERENCE_ROOM"] },
      method: "GET",
      path: "/api/v1/classrooms/available",
      required: ["id", "name", "type", "capacity", "building", "floor", "isActive", "amenities"],
      schema: "ClassroomSummary",
    });
  });

  it("should track the administrative users contract", () => {
    expect(CONTRACT_EXPECTATIONS).toContainEqual({
      enums: { globalRole: ["ADMIN", "USER"] },
      method: "GET",
      path: "/api/v1/admin/users",
      required: [
        "id",
        "firstName",
        "lastName",
        "identificationNumber",
        "email",
        "globalRole",
        "isActive",
        "unit",
        "career",
      ],
      schema: "AdminUser",
    });
  });

  it("should track the administrative user commands", () => {
    const required = [
      "id",
      "firstName",
      "lastName",
      "identificationNumber",
      "email",
      "globalRole",
      "isActive",
      "unit",
      "career",
    ];
    const enums = { globalRole: ["ADMIN", "USER"] };

    expect(CONTRACT_EXPECTATIONS).toContainEqual({
      enums,
      method: "POST",
      path: "/api/v1/admin/users",
      required,
      schema: "AdminUser",
    });
    expect(CONTRACT_EXPECTATIONS).toContainEqual({
      enums,
      method: "GET",
      path: "/api/v1/admin/users/{id}",
      required,
      schema: "AdminUser",
    });
    expect(CONTRACT_EXPECTATIONS).toContainEqual({
      enums,
      method: "PATCH",
      path: "/api/v1/admin/users/{id}",
      requestBody: { enums },
      required,
      schema: "AdminUser",
    });
  });

  it("should track the collaboration roles and permission catalog", () => {
    expect(CONTRACT_EXPECTATIONS).toContainEqual({
      method: "POST",
      path: "/api/v1/event-programs/{id}/collaborators",
      requestBody: { enums: { role: ["VIEWER", "EDITOR", "ORGANIZER"] } },
    });
    expect(CONTRACT_EXPECTATIONS).toContainEqual({
      method: "POST",
      path: "/api/v1/event-programs/{id}/permissions",
      requestBody: {
        enums: {
          permission: [
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
          ],
        },
      },
    });
    for (const resource of ["event-programs", "activities"]) {
      expect(CONTRACT_EXPECTATIONS).toContainEqual({
        method: "DELETE",
        path: `/api/v1/${resource}/{id}/permissions/{permission}`,
      });
    }
  });

  it("should track collaborator provenance and own scope permissions", () => {
    for (const resource of ["event-programs", "activities"]) {
      expect(CONTRACT_EXPECTATIONS).toContainEqual({
        method: "GET",
        path: `/api/v1/${resource}/{id}/collaborators`,
        schema: "CollaboratorListPermission",
        required: ["name", "source", "origin", "validFrom", "validUntil", "effective"],
        enums: { source: ["ROLE_DEFAULT", "OVERRIDE"], origin: ["LOCAL", "INHERITED", "BOTH"] },
      });
      expect(CONTRACT_EXPECTATIONS).toContainEqual({
        method: "DELETE",
        path: `/api/v1/${resource}/{id}/collaborators/{userId}`,
      });
    }
    expect(CONTRACT_EXPECTATIONS).toContainEqual({
      method: "GET",
      path: "/api/v1/users/me/permissions",
      schema: "OwnPermission",
      required: ["name", "origin", "validFrom", "validUntil"],
      enums: { origin: ["LOCAL", "INHERITED", "BOTH"] },
    });
  });

  it("should track the authenticated user scopes contract", () => {
    expect(CONTRACT_EXPECTATIONS).toContainEqual({
      enums: {
        status: ["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED", "ARCHIVED", "SCHEDULED", "ONGOING"],
        type: ["program", "activity"],
      },
      method: "GET",
      path: "/api/v1/users/me/scopes",
      required: [
        "type",
        "id",
        "name",
        "status",
        "eventProgram",
        "organizationalUnit",
        "permissions",
      ],
      schema: "UserScope",
    });
    expect(CONTRACT_EXPECTATIONS).toContainEqual({
      enums: { origin: ["LOCAL", "INHERITED", "BOTH"] },
      method: "GET",
      path: "/api/v1/users/me/scopes",
      required: ["name", "origin", "validFrom", "validUntil"],
      schema: "OwnPermission",
    });
  });

  it("should track the activity update request statuses", () => {
    const expectation = CONTRACT_EXPECTATIONS.find(
      (entry) => entry.method === "PATCH" && entry.path === "/api/v1/activities/{id}",
    );

    expect(expectation?.requestBody).toEqual({
      enums: { status: ["DRAFT", "SCHEDULED"] },
      absentProperties: ["notifyAttendees"],
      additionalProperties: false,
    });
  });

  it("should declare the 5.8 notification block on every activity write body", () => {
    for (const [method, path] of [
      ["POST", "/api/v1/activities"],
      ["PATCH", "/api/v1/activities/{id}"],
      ["POST", "/api/v1/activities/{id}/cancel"],
    ]) {
      const expectation = CONTRACT_EXPECTATIONS.find(
        (entry) => entry.method === method && entry.path === path,
      );

      expect(expectation?.requestBody).toMatchObject({
        absentProperties: ["notifyAttendees"],
        additionalProperties: false,
      });
    }
  });

  it("should track the activity cancellation operation", () => {
    const expectation = CONTRACT_EXPECTATIONS.find(
      (entry) => entry.method === "POST" && entry.path === "/api/v1/activities/{id}/cancel",
    );

    expect(expectation?.schema).toBe("ActivityDetail");
  });

  it("should track the activity deletion operation", () => {
    const expectation = CONTRACT_EXPECTATIONS.find(
      (entry) => entry.method === "DELETE" && entry.path === "/api/v1/activities/{id}",
    );

    expect(expectation?.response).toEqual({ content: "absent", status: "204" });
    expect(expectation?.requestBody).toBe("absent");
  });

  it("should report an optional notifyAttendees in the activity creation request body", () => {
    const document = buildDocument();
    document.paths["/api/v1/activities"].post.requestBody.content[
      "application/json"
    ].schema.properties.notifyAttendees = { type: "boolean" };

    const { issues } = compareContract(document);

    expect(
      issues.some((issue) =>
        issue.includes(
          "El contrato de la operación cambió: revise el bloqueo de notificación de 5.8 antes de integrar nuevos campos.",
        ),
      ),
    ).toBe(true);
  });

  it("should report a required notifyAttendees in the activity update request body", () => {
    const document = buildDocument();
    document.paths["/api/v1/activities/{id}"].patch.requestBody.content[
      "application/json"
    ].schema.properties.notifyAttendees = { type: "boolean" };
    document.paths["/api/v1/activities/{id}"].patch.requestBody.content[
      "application/json"
    ].schema.required = ["notifyAttendees"];

    const { issues } = compareContract(document);

    expect(issues.some((issue) => issue.includes("El contrato de la operación cambió"))).toBe(true);
  });

  it("should report an optional notifyAttendees in the activity cancellation request body", () => {
    const document = buildDocument();
    document.paths["/api/v1/activities/{id}/cancel"].post.requestBody.content[
      "application/json"
    ].schema.properties.notifyAttendees = { type: "boolean" };

    const { issues } = compareContract(document);

    expect(issues.some((issue) => issue.includes("El contrato de la operación cambió"))).toBe(true);
  });

  it("should report when additionalProperties stops being false on an activity request body", () => {
    const document = buildDocument();
    document.paths["/api/v1/activities/{id}"].patch.requestBody.content[
      "application/json"
    ].schema.additionalProperties = true;

    const { issues } = compareContract(document);

    expect(issues.some((issue) => issue.includes("additionalProperties"))).toBe(true);
  });

  it("should request a review when an activity request schema cannot be inspected", () => {
    const document = buildDocument();
    document.paths["/api/v1/activities/{id}/cancel"].post.requestBody.content[
      "application/json"
    ].schema = { $ref: "#/components/schemas/ActivityDetail" };

    const { issues } = compareContract(document);

    expect(issues.some((issue) => issue.includes("requiere revisión"))).toBe(true);
  });

  it("should report a new scope status in the contract", () => {
    const document = buildDocument();
    document.components.schemas.UserScope.properties.status.enum.push("RESCHEDULED");

    const { issues } = compareContract(document);

    expect(issues.some((issue) => issue.includes("nuevo valor RESCHEDULED"))).toBe(true);
  });

  it("should accept a contract that matches the expectations", () => {
    const { checks, issues } = compareContract(buildDocument());

    expect(issues).toEqual([]);
    expect(checks).toBeGreaterThan(0);
  });

  it("should report a missing operation", () => {
    const document = buildDocument();
    delete document.paths["/api/v1/careers"];

    const { issues } = compareContract(document);

    expect(
      issues.some(
        (issue) => issue.includes("GET /api/v1/careers") && issue.includes("ya no existe"),
      ),
    ).toBe(true);
  });

  it("should report a missing schema", () => {
    const document = buildDocument();
    delete document.components.schemas.CareerSummary;

    const { issues } = compareContract(document);

    expect(issues.some((issue) => issue.includes("CareerSummary"))).toBe(true);
  });

  it("should report a missing required field", () => {
    const document = buildDocument();
    document.components.schemas.ActivityDetail.required =
      document.components.schemas.ActivityDetail.required.filter(
        (field) => field !== "cancelReason",
      );

    const { issues } = compareContract(document);

    expect(
      issues.some(
        (issue) => issue.includes("cancelReason") && issue.includes("falta el campo requerido"),
      ),
    ).toBe(true);
  });

  it("should report an enum value removed from the contract", () => {
    const document = buildDocument();
    document.components.schemas.ActivityDetail.properties.status.enum = ["DRAFT"];

    const { issues } = compareContract(document);

    expect(issues.some((issue) => issue.includes("ya no incluye CANCELLED"))).toBe(true);
  });

  it("should report a new enum value in the contract", () => {
    const document = buildDocument();
    document.components.schemas.ActivityDetail.properties.status.enum.push("RESCHEDULED");

    const { issues } = compareContract(document);

    expect(issues.some((issue) => issue.includes("nuevo valor RESCHEDULED"))).toBe(true);
  });

  it("should report a collaboration role removed from the request body", () => {
    const document = buildDocument();
    document.paths["/api/v1/event-programs/{id}/collaborators"].post.requestBody.content[
      "application/json"
    ].schema.properties.role.enum = ["VIEWER", "EDITOR"];

    const { issues } = compareContract(document);

    expect(issues.some((issue) => issue.includes("ya no incluye ORGANIZER"))).toBe(true);
  });

  it("should report a new collaboration role in the request body", () => {
    const document = buildDocument();
    document.paths["/api/v1/activities/{id}/collaborators"].post.requestBody.content[
      "application/json"
    ].schema.properties.role.enum.push("OWNER");

    const { issues } = compareContract(document);

    expect(issues.some((issue) => issue.includes("nuevo valor OWNER"))).toBe(true);
  });

  it("should report a permission removed from the request body", () => {
    const document = buildDocument();
    document.paths["/api/v1/event-programs/{id}/permissions"].post.requestBody.content[
      "application/json"
    ].schema.properties.permission.enum = ["program:read"];

    const { issues } = compareContract(document);

    expect(issues.some((issue) => issue.includes("ya no incluye activity:update"))).toBe(true);
  });

  it("should report a new permission in the request body", () => {
    const document = buildDocument();
    document.paths["/api/v1/activities/{id}/permissions"].post.requestBody.content[
      "application/json"
    ].schema.properties.permission.enum.push("activity:teleport");

    const { issues } = compareContract(document);

    expect(issues.some((issue) => issue.includes("nuevo valor activity:teleport"))).toBe(true);
  });

  it("should report a missing activity cancellation operation", () => {
    const document = buildDocument();
    delete document.paths["/api/v1/activities/{id}/cancel"];

    const { issues } = compareContract(document);

    expect(
      issues.some(
        (issue) =>
          issue.includes("POST /api/v1/activities/{id}/cancel") && issue.includes("ya no existe"),
      ),
    ).toBe(true);
  });

  it("should report a missing activity deletion operation", () => {
    const document = buildDocument();
    delete document.paths["/api/v1/activities/{id}"].delete;

    const { issues } = compareContract(document);

    expect(
      issues.some(
        (issue) =>
          issue.includes("DELETE /api/v1/activities/{id}") && issue.includes("ya no existe"),
      ),
    ).toBe(true);
  });

  it("should report a missing activity deletion response", () => {
    const document = buildDocument();
    delete document.paths["/api/v1/activities/{id}"].delete.responses["204"];

    const { issues } = compareContract(document);

    expect(
      issues.some(
        (issue) =>
          issue.includes("DELETE /api/v1/activities/{id}") &&
          issue.includes("falta la respuesta 204"),
      ),
    ).toBe(true);
  });

  it("should report content added to the activity deletion response", () => {
    const document = buildDocument();
    document.paths["/api/v1/activities/{id}"].delete.responses["204"].content = {
      "application/json": { schema: {} },
    };

    const { issues } = compareContract(document);

    expect(
      issues.some(
        (issue) =>
          issue.includes("DELETE /api/v1/activities/{id}") &&
          issue.includes("204") &&
          issue.includes("sin cuerpo"),
      ),
    ).toBe(true);
  });

  it("should report an undue request body on activity deletion", () => {
    const document = buildDocument();
    document.paths["/api/v1/activities/{id}"].delete.requestBody = {
      content: { "application/json": { schema: {} } },
    };

    const { issues } = compareContract(document);

    expect(
      issues.some(
        (issue) =>
          issue.includes("DELETE /api/v1/activities/{id}") && issue.includes("requestBody"),
      ),
    ).toBe(true);
  });

  it("should report an activity update status change in the request body", () => {
    const document = buildDocument();
    document.paths["/api/v1/activities/{id}"].patch.requestBody.content[
      "application/json"
    ].schema.properties.status.enum.push("ONGOING");

    const { issues } = compareContract(document);

    expect(issues.some((issue) => issue.includes("nuevo valor ONGOING"))).toBe(true);
  });

  it("should report a missing collaboration operation", () => {
    const document = buildDocument();
    delete document.paths["/api/v1/event-programs/{id}/permissions"];

    const { issues } = compareContract(document);

    expect(
      issues.some(
        (issue) =>
          issue.includes("POST /api/v1/event-programs/{id}/permissions") &&
          issue.includes("ya no existe"),
      ),
    ).toBe(true);
  });
});

describe("parseSource", () => {
  it("should read the source flag", () => {
    expect(parseSource(["--source", "docs/openapi.json"])).toBe("docs/openapi.json");
    expect(parseSource([])).toBeUndefined();
  });

  it("should reject unknown options and missing values", () => {
    expect(() => parseSource(["--pretty"])).toThrow(/Opcion desconocida/);
    expect(() => parseSource(["--source"])).toThrow(/Usage/);
  });
});

describe("check-mock-contract CLI", () => {
  it("should exit in green against a compatible document", async () => {
    const file = await writeDocument(buildDocument());

    const { stdout } = await execFileAsync("node", [scriptPath, "--source", file]);

    expect(stdout).toContain("Mocks compatibles con el contrato OpenAPI");
  });

  it("should exit with a Spanish drift report", async () => {
    const document = buildDocument();
    document.components.schemas.ActivityDetail.required =
      document.components.schemas.ActivityDetail.required.filter((field) => field !== "equipment");
    const file = await writeDocument(document);

    await expect(execFileAsync("node", [scriptPath, "--source", file])).rejects.toMatchObject({
      code: 1,
    });
  });
});
