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
    const properties = Object.fromEntries(
      expectation.required.map((field) => [field, { type: "string" }]),
    );
    for (const [field, values] of Object.entries(expectation.enums)) {
      properties[field] = { enum: [...values], type: "string" };
    }

    schemas[expectation.schema] = {
      properties,
      required: [...expectation.required],
      type: "object",
    };
    // Varias operaciones comparten path (por ejemplo el listado y el alta de aulas), asi que el
    // metodo se acumula en el mismo item en lugar de reemplazarlo.
    const pathItem = (paths[expectation.path] ??= {});
    pathItem[expectation.method.toLowerCase()] = {
      responses: {
        200: {
          content: {
            "application/json": {
              schema: { $ref: `#/components/schemas/${expectation.schema}` },
            },
          },
          description: "ok",
        },
      },
      summary: "Fixture",
    };
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
      enums: { type: ["LABORATORY", "CLASSROOM"] },
      method: "GET",
      path: "/api/v1/classrooms/available",
      required: ["id", "name", "type", "capacity", "building", "floor", "isActive", "amenities"],
      schema: "ClassroomSummary",
    });
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
