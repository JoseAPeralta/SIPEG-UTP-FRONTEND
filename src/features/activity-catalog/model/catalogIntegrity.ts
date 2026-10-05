import type { ActivityCatalog } from "@/types/domain";

export class CatalogIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogIntegrityError";
  }
}

function fail(context: string, detail: string): never {
  throw new CatalogIntegrityError(`${context}: ${detail}`);
}

function assertUnique(values: readonly string[], context: string) {
  const seen = new Set<string>();

  values.forEach((value) => {
    if (seen.has(value)) {
      fail(context, `identificador duplicado: ${value}`);
    }

    seen.add(value);
  });
}

export function assertCatalogIntegrity(catalog: ActivityCatalog) {
  assertUnique(
    catalog.organizationalUnits.map((unit) => unit.id),
    "organizationalUnits",
  );
  assertUnique(
    catalog.eventPrograms.map((program) => program.id),
    "eventPrograms",
  );
  assertUnique(
    catalog.activities.map((activity) => activity.id),
    "activities",
  );
  assertUnique(
    catalog.classrooms.map((classroom) => classroom.id),
    "classrooms",
  );

  const unitIds = new Set(catalog.organizationalUnits.map((unit) => unit.id));
  const programIds = new Set(catalog.eventPrograms.map((program) => program.id));
  const classroomIds = new Set(catalog.classrooms.map((classroom) => classroom.id));

  catalog.eventPrograms.forEach((program) => {
    if (!unitIds.has(program.organizationalUnitId)) {
      fail("eventPrograms", `unidad organizativa inexistente: ${program.organizationalUnitId}`);
    }
  });

  catalog.activities.forEach((activity) => {
    if (!programIds.has(activity.eventProgramId)) {
      fail("activities", `programa de eventos inexistente: ${activity.eventProgramId}`);
    }

    if (activity.classroomId !== null && !classroomIds.has(activity.classroomId)) {
      fail("activities", `aula inexistente: ${activity.classroomId}`);
    }
  });
}
