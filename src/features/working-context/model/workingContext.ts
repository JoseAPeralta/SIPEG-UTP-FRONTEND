import type {
  ActivityCatalog,
  EventProgram,
  OrganizationalUnit,
  WorkingContext,
} from "@/types/domain";

export type { WorkingContext };

export type WorkingScope = {
  activityIds: string[];
  label: string;
  program: EventProgram;
  unit: OrganizationalUnit;
};

export type WorkingContextOption = {
  id: string;
  kind: WorkingContext["kind"];
  label: string;
};

export type WorkingContextOptions = {
  activities: WorkingContextOption[];
  programs: WorkingContextOption[];
};

export function resolveWorkingScope(
  context: WorkingContext | null,
  catalog: ActivityCatalog,
): WorkingScope | null {
  if (!context) {
    return null;
  }

  if (context.kind === "activity") {
    const activity = catalog.activities.find((candidate) => candidate.id === context.id);

    if (!activity) {
      return null;
    }

    const program = catalog.eventPrograms.find(
      (candidate) => candidate.id === activity.eventProgramId,
    );
    const unit = program
      ? catalog.organizationalUnits.find(
          (candidate) => candidate.id === program.organizationalUnitId,
        )
      : undefined;

    if (!program || !unit) {
      return null;
    }

    return { activityIds: [activity.id], label: activity.name, program, unit };
  }

  const program = catalog.eventPrograms.find((candidate) => candidate.id === context.id);
  const unit = program
    ? catalog.organizationalUnits.find((candidate) => candidate.id === program.organizationalUnitId)
    : undefined;

  if (!program || !unit) {
    return null;
  }

  return {
    activityIds: catalog.activities
      .filter((activity) => activity.eventProgramId === program.id)
      .map((activity) => activity.id),
    label: program.label ?? program.name,
    program,
    unit,
  };
}

export function buildWorkingContextOptions(catalog: ActivityCatalog): WorkingContextOptions {
  return {
    activities: catalog.activities.map((activity) => ({
      id: activity.id,
      kind: "activity",
      label: activity.name,
    })),
    programs: catalog.eventPrograms.map((program) => ({
      id: program.id,
      kind: "eventProgram",
      label: program.name,
    })),
  };
}

export function serializeWorkingContext(context: WorkingContext | null) {
  return context ? `${context.kind}:${context.id}` : "";
}

export function parseWorkingContext(value: string): WorkingContext | null {
  const separatorIndex = value.indexOf(":");

  if (separatorIndex <= 0) {
    return null;
  }

  const kind = value.slice(0, separatorIndex);
  const id = value.slice(separatorIndex + 1);

  if (!id) {
    return null;
  }

  if (kind === "eventProgram" || kind === "activity") {
    return { id, kind };
  }

  return null;
}
