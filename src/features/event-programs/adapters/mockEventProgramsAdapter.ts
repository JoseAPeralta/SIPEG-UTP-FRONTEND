import type { EventProgramsAdapter } from "@/app/adapters/contracts";
import { ApiError } from "@/app/adapters/http/apiClient";
import { activities } from "@/data/mock/activities";
import { eventPrograms, eventProgramsWithRunningActivities } from "@/data/mock/eventPrograms";
import { organizationalUnits } from "@/data/mock/organizationalUnits";
import type { EventProgram, GlobalRole, OrganizationalUnit } from "@/types/domain";
import type { EventProgramListFilters } from "../model/eventProgramList";
import type {
  CreateEventProgramRequest,
  UpdateEventProgramRequest,
} from "../model/eventProgramRequests";

const PAGE_SIZE = 20;

/** Registro mutable por composicion; compartirlo permite que otros mocks lean el ciclo de vida vivo. */
export type MockEventProgramRegistry = Map<string, EventProgram>;

export function createMockEventProgramRegistry(): MockEventProgramRegistry {
  return new Map(structuredClone(eventPrograms).map((program) => [program.id, program]));
}

export type MockEventProgramsAdapterOptions = {
  /** Rol de la sesion; sin ADMIN el contrato solo permite leer programas ACTIVE. */
  readGlobalRole?: () => GlobalRole | undefined;
  /**
   * Unidades de la misma composicion. El backend rechaza con `400` una unidad inactiva al crear, y
   * este lector permite reproducirlo sin acoplar el mock al fixture congelado.
   */
  readOrganizationalUnits?: () => Promise<OrganizationalUnit[]>;
  /** Registro compartido con el resto de la composicion; sin el, cada factory mantiene el suyo. */
  registry?: MockEventProgramRegistry;
};

export function createMockEventProgramsAdapter({
  readGlobalRole = () => undefined,
  readOrganizationalUnits = () => Promise.resolve(structuredClone(organizationalUnits)),
  registry,
}: MockEventProgramsAdapterOptions = {}): EventProgramsAdapter {
  const programs = registry ?? createMockEventProgramRegistry();

  async function embedUnit(program: EventProgram) {
    const units = await readOrganizationalUnits();
    const unit = units.find((candidate) => candidate.id === program.organizationalUnitId);

    if (!unit) {
      throw new Error(
        `El fixture de programas referencia la unidad inexistente "${program.organizationalUnitId}".`,
      );
    }

    return {
      ...program,
      organizationalUnit: { id: unit.id, name: unit.name, type: unit.type },
    };
  }

  function matchesFilters(program: EventProgram, status: string, filters: EventProgramListFilters) {
    if (status !== "ALL" && program.status !== status) return false;
    if (
      filters.organizationalUnitId &&
      program.organizationalUnitId !== filters.organizationalUnitId
    ) {
      return false;
    }
    if (filters.q) {
      const term = filters.q.trim().toLowerCase();
      const haystack = `${program.name} ${program.label ?? ""}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }

    return true;
  }

  function requireAdministrator() {
    if (readGlobalRole() !== "ADMIN") {
      throw new ApiError("No tiene permisos para esta accion.", 403);
    }
  }

  function rejected(error: unknown): Promise<never> {
    return Promise.reject(error instanceof Error ? error : new Error("La operacion no es valida."));
  }

  function findProgram(programId: string) {
    const program = programs.get(programId);
    if (!program) throw new ApiError("No se encontro el recurso solicitado.", 404);

    return program;
  }

  function assertDatesContainTheirActivities(
    programId: string,
    startDate: string,
    endDate: string,
  ) {
    const outside = activities.some(
      (activity) =>
        activity.eventProgramId === programId &&
        (activity.date < startDate || activity.date > endDate),
    );
    if (outside) throw new ApiError("La operacion entra en conflicto con el estado actual.", 409);
  }

  async function createEventProgram(request: CreateEventProgramRequest) {
    if (readGlobalRole() !== "ADMIN") {
      return Promise.reject(new ApiError("No tiene permisos para esta accion.", 403));
    }
    const units = await readOrganizationalUnits();
    const unit = units.find(
      (candidate) => candidate.id === request.organizationalUnitId && candidate.isActive,
    );
    if (!unit) {
      return Promise.reject(new ApiError("La solicitud no es valida.", 400));
    }

    const created: EventProgram = {
      bannerUrl: null,
      description: request.description,
      endDate: request.endDate,
      id: `program-created-${programs.size + 1}`,
      isDefault: false,
      label: request.label,
      name: request.name,
      organizationalUnitId: request.organizationalUnitId,
      startDate: request.startDate,
      status: "DRAFT",
    };
    programs.set(created.id, created);

    return structuredClone(created);
  }

  function updateEventProgram(
    programId: string,
    request: UpdateEventProgramRequest,
  ): Promise<EventProgram> {
    try {
      requireAdministrator();
      const program = findProgram(programId);
      if (program.status === "ARCHIVED") {
        throw new ApiError("La operacion entra en conflicto con el estado actual.", 409);
      }
      const nextStatus: unknown = request.status;
      if (nextStatus !== undefined && (nextStatus !== "ACTIVE" || program.status !== "DRAFT")) {
        throw new ApiError("La solicitud no es valida.", 400);
      }
      if (request.startDate !== undefined || request.endDate !== undefined) {
        if (program.isDefault) throw new ApiError("La solicitud no es valida.", 400);
        const startDate = request.startDate ?? program.startDate;
        const endDate = request.endDate ?? program.endDate;
        if (!startDate || !endDate || endDate < startDate) {
          throw new ApiError("La solicitud no es valida.", 400);
        }
        assertDatesContainTheirActivities(programId, startDate, endDate);
      }

      if (request.bannerUrl !== undefined) program.bannerUrl = request.bannerUrl;
      if (request.description !== undefined) program.description = request.description;
      if (request.endDate !== undefined) program.endDate = request.endDate;
      if (request.label !== undefined) program.label = request.label;
      if (request.name !== undefined) program.name = request.name;
      if (request.startDate !== undefined) program.startDate = request.startDate;
      if (nextStatus === "ACTIVE") program.status = "ACTIVE";

      return Promise.resolve(structuredClone(program));
    } catch (error) {
      return rejected(error);
    }
  }

  function archiveEventProgram(programId: string): Promise<EventProgram> {
    try {
      requireAdministrator();
      const program = findProgram(programId);
      if (program.status === "ARCHIVED") return Promise.resolve(structuredClone(program));
      if (program.isDefault) {
        throw new ApiError("La operacion entra en conflicto con el estado actual.", 409);
      }
      if (eventProgramsWithRunningActivities.includes(programId)) {
        throw new ApiError("La operacion entra en conflicto con el estado actual.", 409);
      }

      program.status = "ARCHIVED";

      return Promise.resolve(structuredClone(program));
    } catch (error) {
      return rejected(error);
    }
  }

  function reactivateEventProgram(programId: string): Promise<EventProgram> {
    try {
      requireAdministrator();
      const program = findProgram(programId);
      if (program.isDefault || program.status !== "ARCHIVED") {
        throw new ApiError("La operacion entra en conflicto con el estado actual.", 409);
      }
      if (!program.startDate || !program.endDate) {
        throw new ApiError("La solicitud no es valida.", 400);
      }

      program.status = "ACTIVE";

      return Promise.resolve(structuredClone(program));
    } catch (error) {
      return rejected(error);
    }
  }

  async function loadEventProgramsPage(filters: EventProgramListFilters, page: number) {
    await Promise.resolve();
    const requested = filters.status ?? "ACTIVE";
    const status = readGlobalRole() === "ADMIN" ? requested : "ACTIVE";
    const filtered = [...programs.values()]
      .filter((program) => matchesFilters(program, status, filters))
      .sort((left, right) => left.name.localeCompare(right.name, "es"));
    const total = filtered.length;
    const currentPage = Math.max(1, page);
    const start = (currentPage - 1) * PAGE_SIZE;
    const items = await Promise.all(filtered.slice(start, start + PAGE_SIZE).map(embedUnit));

    return {
      items: structuredClone(items),
      limit: PAGE_SIZE,
      page: currentPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    };
  }

  return {
    archiveEventProgram,
    createEventProgram,
    loadEventPrograms: (_access, status = "ACTIVE") => {
      const effectiveStatus = readGlobalRole() === "ADMIN" ? status : "ACTIVE";
      const listed = [...programs.values()].filter(
        (program) => effectiveStatus === "ALL" || program.status === effectiveStatus,
      );

      return Promise.resolve(structuredClone(listed));
    },
    loadEventProgramsPage,
    reactivateEventProgram,
    updateEventProgram,
  };
}
