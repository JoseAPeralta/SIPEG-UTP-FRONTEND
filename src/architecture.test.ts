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
  imports: string[];
  path: string;
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

    return /\.(ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

function collectImportSpecifiers(filePath: string): string[] {
  const source = readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
  const specifiers: string[] = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) {
      continue;
    }

    const specifier = statement.moduleSpecifier;

    if (specifier && ts.isStringLiteral(specifier)) {
      specifiers.push(specifier.text);
    }
  }

  return specifiers;
}

function toRepoPath(filePath: string): string {
  return relative(projectRoot, filePath).split(sep).join("/");
}

function normalizeRepoPath(value: string): string {
  return value.replace(/\/index$/, "").replace(/\.(ts|tsx)$/, "");
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

const sourceFiles: SourceFileRecord[] = listSourceFiles(sourceRoot).map((filePath) => ({
  imports: collectImportSpecifiers(filePath),
  path: toRepoPath(filePath),
}));

function collectViolations(
  check: (file: SourceFileRecord, resolved: string) => string | null,
): Violation[] {
  const violations: Violation[] = [];

  for (const file of sourceFiles) {
    for (const specifier of file.imports) {
      const resolved = resolveSpecifier(file.path, specifier);

      if (!resolved) {
        continue;
      }

      const remediation = check(file, resolved);

      if (remediation) {
        violations.push({ file: file.path, remediation, resolved, specifier });
      }
    }
  }

  return violations;
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
  it("should scan the source tree", () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
  });

  it("R1: only adapters and tests import mocks", () => {
    const violations = collectViolations((file, resolved) => {
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
    const violations = collectViolations((file, resolved) => {
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
    const violations = collectViolations((file, resolved) => {
      const importer = /^src\/features\/([^/]+)\//.exec(file.path);
      const target = /^src\/features\/([^/]+)(?:\/|$)/.exec(resolved);

      if (!importer || !target) {
        return null;
      }

      const importerFeature = importer[1] ?? "";
      const targetFeature = target[1] ?? "";

      if (importerFeature === targetFeature) {
        return null;
      }

      if (resolved === `src/features/${targetFeature}`) {
        return null;
      }

      if (file.path.startsWith("src/app/adapters/")) {
        return null;
      }

      return `importa en profundidad una feature ajena; usa el barrel @/features/${targetFeature}.`;
    });

    expect(renderViolations("R3 cross-feature", violations)).toBe("");
  });

  it("R4: store does not depend on features", () => {
    const violations = collectViolations((file, resolved) => {
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
});
