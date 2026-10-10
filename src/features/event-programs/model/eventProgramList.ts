import type { EventProgram, EventProgramStatus, OrganizationalUnitType } from "@/types/domain";

/** Todo estado del contrato mas el comodin que el backend documenta para listar sin filtrar. */
export type EventProgramStatusFilter = EventProgramStatus | "ALL";

export type EventProgramListFilters = {
  organizationalUnitId?: string;
  q?: string;
  status?: EventProgramStatusFilter;
};

/** Unidad embebida en el listado; evita una consulta adicional para etiquetar cada programa. */
export type EventProgramListUnit = {
  id: string;
  name: string;
  type: OrganizationalUnitType;
};

export type EventProgramListItem = EventProgram & {
  organizationalUnit: EventProgramListUnit;
};

export type EventProgramListPage = {
  items: EventProgramListItem[];
  limit: number;
  page: number;
  total: number;
  totalPages: number;
};
