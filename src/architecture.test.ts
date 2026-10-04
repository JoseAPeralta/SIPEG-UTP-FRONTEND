import { readFileSync, readdirSync } from "node:fs";
import { basename, join, posix, relative, sep } from "node:path";
import process from "node:process";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const sourceRoot = join(projectRoot, "src");

const aliasPrefixes: Record<string, string> = {
  "@/": "src/",
  "@components/": "src/components/",
  "@hooks/": "src/hooks/",
  "@pages/": "src/pages/",
  "@store/": "src/store/",
  "@theme/": "src/theme/",
  "@utils/": "src/utils/",
};

type SourceFileRecord = {
  imports: ImportRecord[];
  path: string;
  sourceFile: ts.SourceFile;
  sourceText: string;
};

type ImportRecord = {
  importedNames: string[];
  specifier: string;
};

type Violation = {
  file: string;
  remediation: string;
  resolved: string;
  specifier: string;
};

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return listSourceFiles(entryPath);
    }

    return /\.(js|ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

function createSourceFileRecord(filePath: string, source: string): SourceFileRecord {
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
  const imports: ImportRecord[] = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) {
      continue;
    }

    const specifier = statement.moduleSpecifier;

    if (specifier && ts.isStringLiteral(specifier)) {
      const importedNames: string[] = [];

      if (ts.isImportDeclaration(statement)) {
        const bindings = statement.importClause?.namedBindings;

        if (statement.importClause?.name) importedNames.push("default");
        if (bindings && ts.isNamespaceImport(bindings)) importedNames.push("*");
        if (bindings && ts.isNamedImports(bindings)) {
          importedNames.push(
            ...bindings.elements.map((element) => element.propertyName?.text ?? element.name.text),
          );
        }
      } else if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        importedNames.push(
          ...statement.exportClause.elements.map(
            (element) => element.propertyName?.text ?? element.name.text,
          ),
        );
      } else {
        importedNames.push("*");
      }

      imports.push({ importedNames, specifier: specifier.text });
    }
  }

  function collectDynamicImports(node: ts.Node) {
    const [argument] =
      ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword
        ? node.arguments
        : [];

    if (argument && ts.isStringLiteral(argument)) {
      imports.push({ importedNames: ["*"], specifier: argument.text });
    }

    ts.forEachChild(node, collectDynamicImports);
  }

  collectDynamicImports(sourceFile);

  return { imports, path: filePath, sourceFile, sourceText: source };
}

function toRepoPath(filePath: string): string {
  return relative(projectRoot, filePath).split(sep).join("/");
}

function normalizeRepoPath(value: string): string {
  return value.replace(/\/index$/, "").replace(/\.(js|ts|tsx)$/, "");
}

function resolveSpecifier(importer: string, specifier: string): string | null {
  if (specifier.startsWith(".")) {
    return normalizeRepoPath(posix.join(posix.dirname(importer), specifier));
  }

  for (const [prefix, target] of Object.entries(aliasPrefixes)) {
    if (specifier.startsWith(prefix)) {
      return normalizeRepoPath(target + specifier.slice(prefix.length));
    }
  }

  return null;
}

const sourceFiles: SourceFileRecord[] = listSourceFiles(sourceRoot).map((filePath) =>
  createSourceFileRecord(toRepoPath(filePath), readFileSync(filePath, "utf8")),
);

function collectViolations(
  files: SourceFileRecord[],
  check: (file: SourceFileRecord, resolved: string, imported: ImportRecord) => string | null,
): Violation[] {
  const violations: Violation[] = [];

  for (const file of files) {
    for (const imported of file.imports) {
      const resolved = resolveSpecifier(file.path, imported.specifier);

      if (!resolved) {
        continue;
      }

      const remediation = check(file, resolved, imported);

      if (remediation) {
        violations.push({ file: file.path, remediation, resolved, specifier: imported.specifier });
      }
    }
  }

  return violations;
}

function checkFeatureBarrel(file: SourceFileRecord, resolved: string): string | null {
  const importerFeature = /^src\/features\/([^/]+)\//.exec(file.path)?.[1];
  const isPublicConsumer =
    file.path.startsWith("src/pages/") || file.path.startsWith("src/components/");
  const targetFeature = /^src\/features\/([^/]+)(?:\/|$)/.exec(resolved)?.[1];

  if (!targetFeature || (!importerFeature && !isPublicConsumer)) {
    return null;
  }

  const focusedPublicEntrypoints = new Set([
    "src/features/activity-catalog/public",
    "src/features/auth/personalArea",
    "src/features/auth/session",
    "src/features/organizational-units/public",
  ]);

  if (
    importerFeature === targetFeature ||
    resolved === `src/features/${targetFeature}` ||
    focusedPublicEntrypoints.has(resolved)
  ) {
    return null;
  }

  return `importa en profundidad una feature; usa el barrel @/features/${targetFeature}.`;
}

function isAdapterPath(path: string): boolean {
  return path.startsWith("src/app/adapters/") || /^src\/features\/[^/]+\/adapters\//.test(path);
}

function isTestPath(path: string): boolean {
  return basename(path).includes(".test.");
}

function checkHttpClientImport(
  file: SourceFileRecord,
  resolved: string,
  imported: ImportRecord,
): string | null {
  if (resolved !== "src/app/adapters/http/apiClient" || isAdapterPath(file.path)) {
    return null;
  }

  const queryException = new Set([
    "src/app/query/queryClient.ts",
    "src/app/query/queryClient.test.ts",
  ]);

  if (
    queryException.has(file.path) &&
    imported.importedNames.length > 0 &&
    imported.importedNames.every((name) => name === "ApiError")
  ) {
    return null;
  }

  return "usa apiRequest solo desde adapters; Query puede importar exclusivamente ApiError para su politica de reintentos.";
}

function createSyntaxViolation(file: SourceFileRecord, kind: "endpoint" | "fetch"): Violation {
  return {
    file: file.path,
    remediation:
      kind === "fetch"
        ? "mueve la solicitud HTTP a un adapter y usa apiRequest."
        : "mueve el endpoint /api/v1 a un adapter HTTP.",
    resolved: kind === "fetch" ? "global fetch" : "/api/v1",
    specifier: kind === "fetch" ? "fetch(...)" : '"/api/v1..."',
  };
}

function collectSyntaxViolations(files: SourceFileRecord[]): Violation[] {
  const violations: Violation[] = [];

  for (const file of files) {
    const allowsHttpSyntax = isAdapterPath(file.path) || isTestPath(file.path);
    const allowsDirectFetch = allowsHttpSyntax || file.path === "src/pwa/serviceWorker.js";

    function visit(node: ts.Node) {
      if (!allowsDirectFetch && ts.isCallExpression(node)) {
        const expression = node.expression;
        const isGlobalFetch =
          (ts.isIdentifier(expression) && expression.text === "fetch") ||
          (ts.isPropertyAccessExpression(expression) &&
            expression.name.text === "fetch" &&
            ts.isIdentifier(expression.expression) &&
            ["globalThis", "self", "window"].includes(expression.expression.text));

        if (isGlobalFetch) {
          violations.push(createSyntaxViolation(file, "fetch"));
        }
      }

      if (!allowsHttpSyntax) {
        const hasApiEndpoint =
          (ts.isStringLiteralLike(node) && node.text.includes("/api/v1")) ||
          (ts.isTemplateExpression(node) &&
            [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].some((text) =>
              text.includes("/api/v1"),
            ));

        if (hasApiEndpoint) {
          violations.push(createSyntaxViolation(file, "endpoint"));
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(file.sourceFile);
  }

  return violations;
}

const operationsConsumers = new Set([
  "src/app/adapters/createBrowserAppAdapters.ts",
  "src/app/adapters/createAppAdapters.test.ts",
  "src/app/adapters/createAppAdapters.ts",
  "src/features/attendance/hooks/useAttendanceOverview.ts",
  "src/features/certificates/hooks/useCertificatesOverview.ts",
  "src/features/dashboard/hooks/useDashboardOverview.ts",
  "src/features/reports/hooks/useReportsOverview.ts",
  "src/features/speakers/hooks/useSpeakersOverview.ts",
  "src/features/users/hooks/useUsersOverview.ts",
]);

/**
 * R8: each catalog endpoint is owned by exactly one feature adapter. Without this, a future
 * aggregate adapter could silently reintroduce a duplicated request for the same resource.
 */
const ownedCatalogEndpoints: readonly { endpoint: string; owner: string }[] = [
  {
    endpoint: "/api/v1/organizational-units",
    owner: "src/features/organizational-units/adapters/",
  },
  { endpoint: "/api/v1/careers", owner: "src/features/careers/adapters/" },
  { endpoint: "/api/v1/classrooms", owner: "src/features/classrooms/adapters/" },
];

function collectEndpointOwnershipViolations(files: SourceFileRecord[]): Violation[] {
  const violations: Violation[] = [];

  for (const file of files) {
    for (const { endpoint, owner } of ownedCatalogEndpoints) {
      if (!file.sourceText.includes(endpoint) || file.path.startsWith(owner)) {
        continue;
      }

      violations.push({
        file: file.path,
        remediation: `reutiliza el adapter de ${owner} en lugar de volver a leer ${endpoint}.`,
        resolved: endpoint,
        specifier: endpoint,
      });
    }
  }

  return violations;
}

function checkOperationsConsumer(file: SourceFileRecord, resolved: string): string | null {
  if (!resolved.startsWith("src/features/operations")) {
    return null;
  }

  if (file.path.startsWith("src/features/operations/") || operationsConsumers.has(file.path)) {
    return null;
  }

  return "no agregues consumidores de OperationsAdapter; crea el adapter del dominio cuando se integre.";
}

function renderViolations(rule: string, violations: Violation[]): string {
  if (violations.length === 0) {
    return "";
  }

  return [
    `${rule}: ${violations.length} violacion(es) de arquitectura`,
    ...violations.flatMap((violation) => [
      `  ${violation.file}`,
      `    import "${violation.specifier}" -> ${violation.resolved}`,
      `    remediacion: ${violation.remediation}`,
    ]),
  ].join("\n");
}

describe("architecture fitness", () => {
  it("detects deep feature imports from pages", () => {
    const fixture = createSourceFileRecord(
      "src/pages/UsersPage.tsx",
      'import { useUsersOverview } from "@/features/users/hooks/useUsersOverview";',
    );

    expect(collectViolations([fixture], checkFeatureBarrel)).toHaveLength(1);
  });

  it("detects apiRequest imports outside adapters", () => {
    const fixture = createSourceFileRecord(
      "src/features/users/hooks/useUsers.ts",
      'import { apiRequest as request } from "@/app/adapters/http/apiClient";',
    );

    expect(collectViolations([fixture], checkHttpClientImport)).toHaveLength(1);
  });

  it("detects dynamic access to the HTTP client outside adapters", () => {
    const fixture = createSourceFileRecord(
      "src/features/users/hooks/useUsers.ts",
      'export const loadClient = () => import("@/app/adapters/http/apiClient");',
    );

    expect(collectViolations([fixture], checkHttpClientImport)).toHaveLength(1);
  });

  it("detects direct fetch and API endpoint literals outside adapters", () => {
    const fixture = createSourceFileRecord(
      "src/features/users/hooks/useUsers.ts",
      'export const loadUsers = () => fetch("/api/v1/users");',
    );

    expect(collectSyntaxViolations([fixture])).toHaveLength(2);
  });

  it("detects new consumers of the operations aggregate", () => {
    const fixture = createSourceFileRecord(
      "src/features/alerts/hooks/useAlerts.ts",
      'import { useOperations } from "@/features/operations";',
    );

    expect(collectViolations([fixture], checkOperationsConsumer)).toHaveLength(1);
  });

  it("R8: detects a catalog endpoint read outside its owning feature", () => {
    const fixture = createSourceFileRecord(
      "src/features/registration/adapters/apiRegistrationAdapter.ts",
      'const url = "/api/v1/organizational-units?page=1";',
    );

    expect(collectEndpointOwnershipViolations([fixture]).map((v) => v.resolved)).toEqual([
      "/api/v1/organizational-units",
    ]);
  });

  it("R8: accepts an endpoint inside its owning feature adapter", () => {
    const fixture = createSourceFileRecord(
      "src/features/organizational-units/adapters/apiOrganizationalUnitsAdapter.ts",
      'const url = "/api/v1/organizational-units?page=1";',
    );

    expect(collectEndpointOwnershipViolations([fixture])).toHaveLength(0);
  });

  it("keeps documented architecture exceptions narrow", () => {
    const queryPolicy = createSourceFileRecord(
      "src/app/query/queryClient.ts",
      'import { ApiError } from "@/app/adapters/http/apiClient";',
    );
    const publicBarrel = createSourceFileRecord(
      "src/pages/UsersPage.tsx",
      'import { useUsersOverview } from "@/features/users";',
    );
    const focusedPublicBarrel = createSourceFileRecord(
      "src/pages/LandingPage.tsx",
      'import { usePublicActivities } from "@/features/activity-catalog/public";',
    );
    const existingOperationsConsumer = createSourceFileRecord(
      "src/features/users/hooks/useUsersOverview.ts",
      'import { useOperations } from "@/features/operations";',
    );
    const syntaxFalsePositives = createSourceFileRecord(
      "src/features/users/hooks/useUsers.ts",
      "// GET /api/v1/users\nexport const loadUsers = (fetcher: () => void) => fetcher();",
    );

    expect(collectViolations([queryPolicy], checkHttpClientImport)).toHaveLength(0);
    expect(collectViolations([publicBarrel], checkFeatureBarrel)).toHaveLength(0);
    expect(collectViolations([focusedPublicBarrel], checkFeatureBarrel)).toHaveLength(0);
    expect(collectViolations([existingOperationsConsumer], checkOperationsConsumer)).toHaveLength(
      0,
    );
    expect(collectSyntaxViolations([syntaxFalsePositives])).toHaveLength(0);
  });

  it("should scan the source tree", () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
  });

  it("R1: only adapters and tests import mocks", () => {
    const violations = collectViolations(sourceFiles, (file, resolved) => {
      if (!resolved.startsWith("src/data/mock")) {
        return null;
      }

      if (file.path.startsWith("src/data/mock/")) {
        return null;
      }

      if (file.path.startsWith("src/app/adapters/")) {
        return null;
      }

      if (/^src\/features\/[^/]+\/adapters\//.test(file.path)) {
        return null;
      }

      if (basename(file.path).includes(".test.")) {
        return null;
      }

      return "mueve el acceso a mocks a src/app/adapters/** o src/features/<dominio>/adapters/**, o usa un archivo de test.";
    });

    expect(renderViolations("R1 mocks", violations)).toBe("");
  });

  it("R2: shared UI does not depend on features", () => {
    const violations = collectViolations(sourceFiles, (file, resolved) => {
      if (!file.path.startsWith("src/components/ui/")) {
        return null;
      }

      if (!resolved.startsWith("src/features/")) {
        return null;
      }

      return "invierte la dependencia o mueve el componente a src/features/<dominio>/ui.";
    });

    expect(renderViolations("R2 UI pura", violations)).toBe("");
  });

  it("R3: cross-feature imports use the public barrel", () => {
    const violations = collectViolations(sourceFiles, checkFeatureBarrel);

    expect(renderViolations("R3 cross-feature", violations)).toBe("");
  });

  it("R4: store does not depend on features", () => {
    const violations = collectViolations(sourceFiles, (file, resolved) => {
      if (!file.path.startsWith("src/store/")) {
        return null;
      }

      if (!resolved.startsWith("src/features/")) {
        return null;
      }

      return "mueve el tipo o dato compartido a src/types/domain.ts; el store no conoce features.";
    });

    expect(renderViolations("R4 store", violations)).toBe("");
  });

  it("R5: only adapters import the HTTP request capability", () => {
    const violations = collectViolations(sourceFiles, checkHttpClientImport);

    expect(renderViolations("R5 HTTP client", violations)).toBe("");
  });

  it("R6: direct fetch and API endpoint literals stay in adapters", () => {
    const violations = collectSyntaxViolations(sourceFiles);

    expect(renderViolations("R6 HTTP syntax", violations)).toBe("");
  });

  it("R7: the operations aggregate has a closed consumer list", () => {
    const violations = collectViolations(sourceFiles, checkOperationsConsumer);

    expect(renderViolations("R7 operations consumers", violations)).toBe("");
  });

  it("R8: catalog endpoints are read only by their owning feature adapter", () => {
    const violations = collectEndpointOwnershipViolations(
      sourceFiles.filter((file) => !isTestPath(file.path)),
    );

    expect(renderViolations("R8 catalog endpoint ownership", violations)).toBe("");
  });

  it("R9: startup modules avoid broad runtime barrels", () => {
    const startupBoundaries = new Map<string, readonly string[]>([
      ["src/main.tsx", ['"@/app/adapters"', '"@/app/query"', '"@/components"']],
      ["src/App.tsx", ['"@/components"', '"@/features/auth"']],
      ["src/pages/LandingPage.tsx", ['"@/components"', '"@/features/activity-catalog"']],
      ["src/app/adapters/createBrowserAppAdapters.ts", ['"./createAppAdapters"']],
    ]);
    const violations = sourceFiles.flatMap((file) =>
      (startupBoundaries.get(file.path) ?? [])
        .filter((specifier) => file.sourceText.includes(`from ${specifier}`))
        .map((specifier) => `${file.path}: ${specifier}`),
    );

    expect(violations).toEqual([]);
  });

  it("R10: mock adapters import focused fixtures", () => {
    const violations = collectViolations(sourceFiles, (file, resolved) => {
      if (!file.path.includes("/adapters/") || isTestPath(file.path)) return null;
      if (resolved !== "src/data/mock") return null;

      return "importa el fixture concreto en lugar del barrel completo de mocks.";
    });

    expect(renderViolations("R10 focused mocks", violations)).toBe("");
  });

  it("R11: public agenda modules avoid broad cross-domain barrels", () => {
    const publicAgendaFiles = new Set([
      "src/features/activity-catalog/model/publicCatalogSelectors.ts",
      "src/features/activity-catalog/ui/PublicActivityCard.tsx",
      "src/features/activity-catalog/ui/PublicActivityFilters.tsx",
    ]);
    const broadBarrels = new Set(["@/components", "@/features/organizational-units"]);
    const violations = sourceFiles.flatMap((file) =>
      publicAgendaFiles.has(file.path)
        ? file.imports
            .filter((imported) => broadBarrels.has(imported.specifier))
            .map((imported) => `${file.path}: ${imported.specifier}`)
        : [],
    );

    expect(violations).toEqual([]);
  });
});
