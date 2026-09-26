import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createOperationView,
  DEFAULT_SOURCE,
  findOperations,
  loadOpenApi,
  parseArguments,
} from "./query-api-contract.mjs";

const execFileAsync = promisify(execFile);
const scriptPath = join(import.meta.dirname, "query-api-contract.mjs");

const document = {
  openapi: "3.1.0",
  info: { title: "Test API", version: "1.0.0" },
  servers: [{ url: "http://localhost:3000" }],
  paths: {
    "/api/v1/users/me": {
      parameters: [{ in: "header", name: "Accept-Language", schema: { type: "string" } }],
      get: {
        description: "Returns the authenticated account.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UserEnvelope" },
              },
            },
            description: "Current user.",
          },
        },
        security: [{ bearerAuth: [] }],
        summary: "Get the authenticated user profile",
        tags: ["Users"],
      },
    },
    "/api/v1/auth/login": {
      post: {
        responses: { 200: { description: "Authenticated." } },
        summary: "Log in",
        tags: ["Auth"],
      },
    },
  },
  components: {
    schemas: {
      AuthPayload: { properties: { token: { type: "string" } }, type: "object" },
      Unit: { properties: { name: { type: "string" } }, type: "object" },
      User: {
        properties: {
          manager: { $ref: "#/components/schemas/User" },
          unit: { $ref: "#/components/schemas/Unit" },
        },
        type: "object",
      },
      UserEnvelope: {
        properties: { data: { $ref: "#/components/schemas/User" } },
        type: "object",
      },
    },
    securitySchemes: {
      apiKey: { in: "header", name: "X-API-Key", type: "apiKey" },
      bearerAuth: { bearerFormat: "JWT", scheme: "bearer", type: "http" },
    },
  },
};

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe("findOperations", () => {
  it.each(["users", "AUTHENTICATED", "profile", "/api/v1/users/me"])(
    "finds an operation by '%s'",
    (query) => {
      expect(findOperations(document, query)).toEqual([
        {
          method: "GET",
          path: "/api/v1/users/me",
          summary: "Get the authenticated user profile",
          tags: ["Users"],
        },
      ]);
    },
  );

  it("returns an empty list when no operation matches", () => {
    expect(findOperations(document, "classrooms")).toEqual([]);
  });

  it("rejects blank searches instead of returning every operation", () => {
    expect(() => findOperations(document, "   ")).toThrow("Search text cannot be empty");
  });
});

describe("createOperationView", () => {
  it("returns only the selected operation and its transitive components", () => {
    const view = createOperationView(document, "get", "/api/v1/users/me");

    expect(view.method).toBe("GET");
    expect(view.path).toBe("/api/v1/users/me");
    expect(view.pathParameters).toEqual(document.paths["/api/v1/users/me"].parameters);
    expect(view.security).toEqual([{ bearerAuth: [] }]);
    expect(view.operation.summary).toBe("Get the authenticated user profile");
    expect(Object.keys(view.components.schemas).sort()).toEqual(["Unit", "User", "UserEnvelope"]);
    expect(view.components.securitySchemes).toEqual({
      bearerAuth: document.components.securitySchemes.bearerAuth,
    });
    expect(JSON.stringify(view)).not.toContain("/api/v1/auth/login");
    expect(JSON.stringify(view)).not.toContain("AuthPayload");
    expect(JSON.stringify(view)).not.toContain("apiKey");
  });

  it("reports inherited security and the most specific servers", () => {
    const inheritedDocument = structuredClone(document);
    delete inheritedDocument.paths["/api/v1/users/me"].get.security;
    inheritedDocument.security = [{ bearerAuth: ["profile:read"] }];
    inheritedDocument.paths["/api/v1/users/me"].servers = [{ url: "https://path.example" }];

    const pathView = createOperationView(inheritedDocument, "GET", "/api/v1/users/me");
    expect(pathView.security).toEqual([{ bearerAuth: ["profile:read"] }]);
    expect(pathView.servers).toEqual([{ url: "https://path.example" }]);

    inheritedDocument.paths["/api/v1/users/me"].get.servers = [
      { url: "https://operation.example" },
    ];
    expect(createOperationView(inheritedDocument, "GET", "/api/v1/users/me").servers).toEqual([
      { url: "https://operation.example" },
    ]);
  });

  it("resolves local path-item references", () => {
    const referencedDocument = structuredClone(document);
    referencedDocument.paths["/api/v1/profile"] = {
      $ref: "#/paths/~1api~1v1~1users~1me",
    };

    const view = createOperationView(referencedDocument, "GET", "/api/v1/profile");
    expect(view.path).toBe("/api/v1/profile");
    expect(view.operation.summary).toBe("Get the authenticated user profile");
  });

  it("rejects external references instead of returning an incomplete contract", () => {
    const externalDocument = structuredClone(document);
    externalDocument.paths["/api/v1/users/me"].get.responses[200].content[
      "application/json"
    ].schema = { $ref: "./schemas.json#/User" };

    expect(() => createOperationView(externalDocument, "GET", "/api/v1/users/me")).toThrow(
      "External OpenAPI references are not supported",
    );
  });

  it("rejects unknown paths and unsupported methods with actionable errors", () => {
    expect(() => createOperationView(document, "GET", "/missing")).toThrow(
      "OpenAPI path not found: /missing",
    );
    expect(() => createOperationView(document, "TRACE", "/api/v1/users/me")).toThrow(
      "OpenAPI operation not found: TRACE /api/v1/users/me",
    );
  });
});

describe("loadOpenApi", () => {
  it("loads and validates a local OpenAPI document", async () => {
    const directory = await mkdtemp(join(tmpdir(), "sipeg-openapi-"));
    temporaryDirectories.push(directory);
    const file = join(directory, "openapi.json");
    await writeFile(file, JSON.stringify(document));

    await expect(loadOpenApi(file)).resolves.toEqual(document);
  });

  it("loads a live document through the provided fetch implementation", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(new Response(JSON.stringify(document)));

    await expect(
      loadOpenApi("http://localhost:3000/api/openapi.json", fetchImplementation),
    ).resolves.toEqual(document);
    expect(fetchImplementation).toHaveBeenCalledWith(
      "http://localhost:3000/api/openapi.json",
      expect.objectContaining({ redirect: "error", signal: expect.any(AbortSignal) }),
    );
  });

  it("uses the running backend contract by default", () => {
    expect(DEFAULT_SOURCE).toBe("http://localhost:3000/api/openapi.json");
  });

  it("reports an actionable error when the live source is unreachable", async () => {
    const fetchImplementation = vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED"));

    await expect(loadOpenApi(DEFAULT_SOURCE, fetchImplementation)).rejects.toThrow(
      "Unable to reach the running backend at http://localhost:3000/api/openapi.json",
    );
  });

  it("rejects non-loopback URLs and unrelated local paths", async () => {
    const fetchImplementation = vi.fn();

    await expect(
      loadOpenApi("https://example.com/api/openapi.json", fetchImplementation),
    ).rejects.toThrow("Only loopback OpenAPI URLs are allowed");
    await expect(loadOpenApi("http://localhost:3000/health", fetchImplementation)).rejects.toThrow(
      "Only the /api/openapi.json endpoint is allowed",
    );
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it("stops reading remote documents that exceed the safety limit", async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(5 * 1024 * 1024 + 1));
        controller.close();
      },
    });
    const fetchImplementation = vi.fn().mockResolvedValue({ body, ok: true, status: 200 });

    await expect(
      loadOpenApi("http://localhost:3000/api/openapi.json", fetchImplementation),
    ).rejects.toThrow("exceeds the 5 MiB safety limit");
  });

  it("rejects documents without OpenAPI paths", async () => {
    const directory = await mkdtemp(join(tmpdir(), "sipeg-openapi-"));
    temporaryDirectories.push(directory);
    const file = join(directory, "invalid.json");
    await writeFile(file, JSON.stringify({ openapi: "3.1.0" }));

    await expect(loadOpenApi(file)).rejects.toThrow("The source is not a valid OpenAPI document");
  });
});

describe("parseArguments", () => {
  it("ignores the pnpm argument separator", () => {
    expect(parseArguments(["--", "get", "GET", "/api/v1/users/me"])).toEqual({
      command: "get",
      method: "GET",
      path: "/api/v1/users/me",
      pretty: false,
      source: undefined,
    });
  });

  it("parses searches with a source override", () => {
    expect(parseArguments(["search", "user profile", "--source", "contract.json"])).toEqual({
      command: "search",
      pretty: false,
      query: "user profile",
      source: "contract.json",
    });
  });

  it("treats a non-leading separator as the end of options", () => {
    expect(parseArguments(["--", "search", "--", "--pretty"])).toEqual({
      command: "search",
      pretty: false,
      query: "--pretty",
      source: undefined,
    });
  });

  it("parses pretty operation lookups", () => {
    expect(parseArguments(["get", "GET", "/api/v1/users/me", "--pretty"])).toEqual({
      command: "get",
      method: "GET",
      path: "/api/v1/users/me",
      pretty: true,
      source: undefined,
    });
  });

  it("rejects incomplete commands", () => {
    expect(() => parseArguments(["get", "GET"])).toThrow("Usage:");
    expect(() => parseArguments(["search"])).toThrow("Usage:");
    expect(() => parseArguments(["search", "users", "--source", "--pretty"])).toThrow("Usage:");
  });
});

describe("command line interface", () => {
  it("prints a compact operation view and exits successfully", async () => {
    const directory = await mkdtemp(join(tmpdir(), "sipeg-openapi-"));
    temporaryDirectories.push(directory);
    const file = join(directory, "openapi.json");
    await writeFile(file, JSON.stringify(document));

    const { stderr, stdout } = await execFileAsync(process.execPath, [
      scriptPath,
      "--",
      "get",
      "GET",
      "/api/v1/users/me",
      "--source",
      file,
    ]);

    expect(stderr).toBe("");
    expect(stdout.trim()).not.toContain("\n");
    expect(JSON.parse(stdout)).toMatchObject({ method: "GET", path: "/api/v1/users/me" });
  });

  it("uses SIPEG_OPENAPI_SOURCE and reports failures through stderr", async () => {
    const directory = await mkdtemp(join(tmpdir(), "sipeg-openapi-"));
    temporaryDirectories.push(directory);
    const file = join(directory, "openapi.json");
    await writeFile(file, JSON.stringify(document));
    const environment = { ...process.env, SIPEG_OPENAPI_SOURCE: file };

    const { stdout } = await execFileAsync(
      process.execPath,
      [scriptPath, "--", "search", "profile"],
      { env: environment },
    );
    expect(JSON.parse(stdout)).toHaveLength(1);

    await expect(
      execFileAsync(process.execPath, [scriptPath, "--", "get", "GET", "/missing"], {
        env: environment,
      }),
    ).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining("OpenAPI path not found: /missing"),
    });
  });
});
