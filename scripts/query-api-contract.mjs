import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const HTTP_METHODS = new Set(["delete", "get", "head", "options", "patch", "post", "put", "trace"]);
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "[::1]", "localhost"]);
const MAX_REMOTE_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const DEFAULT_SOURCE = "http://localhost:3000/api/openapi.json";
const USAGE = `Usage:
  pnpm run api:contract -- search <text> [--source <path-or-url>] [--pretty]
  pnpm run api:contract -- get <method> <path> [--source <path-or-url>] [--pretty]`;

function assertOpenApiDocument(document) {
  if (
    !document ||
    typeof document !== "object" ||
    Array.isArray(document) ||
    typeof document.openapi !== "string" ||
    !document.paths ||
    typeof document.paths !== "object" ||
    Array.isArray(document.paths)
  ) {
    throw new Error("The source is not a valid OpenAPI document: expected openapi and paths.");
  }

  return document;
}

function parseHttpSource(source) {
  try {
    const url = new URL(source);
    return url.protocol === "http:" || url.protocol === "https:" ? url : undefined;
  } catch {
    return undefined;
  }
}

async function readRemoteDocument(response) {
  if (!response.body || typeof response.body.getReader !== "function") {
    throw new Error("The remote OpenAPI response does not provide a readable body.");
  }

  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  const chunks = [];
  let bytesRead = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      bytesRead += value.byteLength;
      if (bytesRead > MAX_REMOTE_DOCUMENT_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new Error("The remote OpenAPI document exceeds the 5 MiB safety limit.");
      }
      chunks.push(decoder.decode(value, { stream: true }));
    }
    chunks.push(decoder.decode());
    return chunks.join("");
  } finally {
    reader.releaseLock();
  }
}

export async function loadOpenApi(source, fetchImplementation = fetch) {
  let document;
  const sourceUrl = parseHttpSource(source);

  if (sourceUrl) {
    if (!LOOPBACK_HOSTS.has(sourceUrl.hostname)) {
      throw new Error("Only loopback OpenAPI URLs are allowed.");
    }
    if (sourceUrl.pathname !== "/api/openapi.json") {
      throw new Error("Only the /api/openapi.json endpoint is allowed for HTTP sources.");
    }
    if (sourceUrl.username || sourceUrl.password || sourceUrl.search || sourceUrl.hash) {
      throw new Error("OpenAPI URLs cannot contain credentials, query parameters or fragments.");
    }

    let response;
    try {
      response = await fetchImplementation(source, {
        redirect: "error",
        signal: AbortSignal.timeout(5_000),
      });
    } catch (error) {
      throw new Error(
        `Unable to reach the running backend at ${sourceUrl.origin}${sourceUrl.pathname}. Start the backend or pass --source with another OpenAPI document.`,
        { cause: error },
      );
    }
    if (!response.ok) {
      throw new Error(
        `Unable to load OpenAPI source ${sourceUrl.origin}${sourceUrl.pathname}: HTTP ${response.status}.`,
      );
    }
    const contents = await readRemoteDocument(response);
    document = JSON.parse(contents);
  } else {
    const contents = await readFile(resolve(source), "utf8");
    document = JSON.parse(contents);
  }

  return assertOpenApiDocument(document);
}

export function findOperations(document, query) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) {
    throw new Error("Search text cannot be empty.");
  }
  const matches = [];

  for (const [path, unresolvedPathItem] of Object.entries(document.paths)) {
    const pathItem = resolvePathItem(document, unresolvedPathItem);
    for (const [method, operation] of Object.entries(pathItem)) {
      if (
        !HTTP_METHODS.has(method.toLocaleLowerCase()) ||
        !operation ||
        typeof operation !== "object"
      ) {
        continue;
      }

      const tags = Array.isArray(operation.tags) ? operation.tags : [];
      const searchable = [path, operation.summary, operation.description, ...tags]
        .filter((value) => typeof value === "string")
        .join(" ")
        .toLocaleLowerCase();

      if (searchable.includes(normalizedQuery)) {
        matches.push({
          method: method.toLocaleUpperCase(),
          path,
          summary: typeof operation.summary === "string" ? operation.summary : "",
          tags,
        });
      }
    }
  }

  return matches;
}

function decodeJsonPointer(ref) {
  return ref
    .slice(2)
    .split("/")
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"));
}

function resolvePointer(document, ref) {
  return decodeJsonPointer(ref).reduce((current, segment) => current?.[segment], document);
}

function resolvePathItem(document, pathItem, visitedRefs = new Set()) {
  if (!pathItem || typeof pathItem !== "object" || typeof pathItem.$ref !== "string") {
    return pathItem;
  }
  if (!pathItem.$ref.startsWith("#/")) {
    throw new Error(`External OpenAPI references are not supported: ${pathItem.$ref}`);
  }
  if (visitedRefs.has(pathItem.$ref)) {
    throw new Error(`Circular OpenAPI path reference: ${pathItem.$ref}`);
  }
  visitedRefs.add(pathItem.$ref);

  const resolved = resolvePointer(document, pathItem.$ref);
  if (!resolved || typeof resolved !== "object") {
    throw new Error(`OpenAPI reference not found: ${pathItem.$ref}`);
  }

  const siblings = { ...pathItem };
  delete siblings.$ref;
  return { ...resolvePathItem(document, resolved, visitedRefs), ...siblings };
}

function collectReferencedComponents(document, seeds) {
  const components = {};
  const visitedRefs = new Set();
  const visitedObjects = new WeakSet();

  function visit(value) {
    if (!value || typeof value !== "object") {
      return;
    }
    if (visitedObjects.has(value)) {
      return;
    }
    visitedObjects.add(value);

    if (typeof value.$ref === "string") {
      if (!value.$ref.startsWith("#/")) {
        throw new Error(`External OpenAPI references are not supported: ${value.$ref}`);
      }
      if (!value.$ref.startsWith("#/components/")) {
        throw new Error(`Unsupported local OpenAPI reference: ${value.$ref}`);
      }
      includeRef(value.$ref);
    }

    for (const child of Object.values(value)) {
      visit(child);
    }
  }

  function includeRef(ref) {
    const segments = decodeJsonPointer(ref);
    if (segments.length < 3 || segments[0] !== "components") {
      return;
    }

    const [, group, name] = segments;
    const componentRef = `#/components/${group.replaceAll("~", "~0").replaceAll("/", "~1")}/${name
      .replaceAll("~", "~0")
      .replaceAll("/", "~1")}`;
    if (visitedRefs.has(componentRef)) {
      return;
    }
    visitedRefs.add(componentRef);

    const component = resolvePointer(document, componentRef);
    if (component === undefined) {
      throw new Error(`OpenAPI reference not found: ${componentRef}`);
    }

    components[group] ??= {};
    components[group][name] = component;
    visit(component);
  }

  visit(seeds);
  return { components, visit };
}

export function createOperationView(document, method, path) {
  const unresolvedPathItem = document.paths[path];
  if (!unresolvedPathItem || typeof unresolvedPathItem !== "object") {
    throw new Error(`OpenAPI path not found: ${path}`);
  }
  const pathItem = resolvePathItem(document, unresolvedPathItem);

  const normalizedMethod = method.toLocaleLowerCase();
  const operation = pathItem[normalizedMethod];
  if (!HTTP_METHODS.has(normalizedMethod) || !operation || typeof operation !== "object") {
    throw new Error(`OpenAPI operation not found: ${method.toLocaleUpperCase()} ${path}`);
  }

  const pathParameters = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];
  const { components, visit } = collectReferencedComponents(document, {
    operation,
    pathParameters,
  });
  const security = operation.security ?? document.security ?? [];

  for (const requirement of security) {
    if (!requirement || typeof requirement !== "object") {
      continue;
    }
    for (const name of Object.keys(requirement)) {
      const scheme = document.components?.securitySchemes?.[name];
      if (scheme !== undefined) {
        components.securitySchemes ??= {};
        components.securitySchemes[name] = scheme;
        visit(scheme);
      }
    }
  }

  return {
    openapi: document.openapi,
    servers: operation.servers ?? pathItem.servers ?? document.servers ?? [],
    method: normalizedMethod.toLocaleUpperCase(),
    path,
    pathParameters,
    security,
    operation,
    components,
  };
}

export function parseArguments(argumentsList) {
  const positionals = [];
  let optionsEnded = false;
  let pretty = false;
  let source;

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--") {
      if (index === 0 && positionals.length === 0) {
        continue;
      }
      optionsEnded = true;
      continue;
    }
    if (!optionsEnded && argument === "--pretty") {
      pretty = true;
      continue;
    }
    if (!optionsEnded && argument === "--source") {
      source = argumentsList[index + 1];
      if (!source || source.startsWith("--")) {
        throw new Error(USAGE);
      }
      index += 1;
      continue;
    }
    if (!optionsEnded && argument.startsWith("--")) {
      throw new Error(`${USAGE}\n\nUnknown option: ${argument}`);
    }
    positionals.push(argument);
  }

  const [command, ...values] = positionals;
  if (command === "search" && values.length > 0) {
    return { command, pretty, query: values.join(" "), source };
  }
  if (command === "get" && values.length === 2) {
    return { command, method: values[0], path: values[1], pretty, source };
  }

  throw new Error(USAGE);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const source = options.source ?? process.env.SIPEG_OPENAPI_SOURCE ?? DEFAULT_SOURCE;
  const document = await loadOpenApi(source);
  const result =
    options.command === "search"
      ? findOperations(document, options.query)
      : createOperationView(document, options.method, options.path);

  console.log(JSON.stringify(result, null, options.pretty ? 2 : undefined));
}

const entryPoint = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (entryPoint === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
