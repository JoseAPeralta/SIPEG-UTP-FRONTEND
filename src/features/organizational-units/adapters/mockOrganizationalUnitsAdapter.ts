import type { OrganizationalUnitsAdapter } from "@/app/adapters/contracts";
import { ApiError } from "@/app/adapters/http/apiClient";
import {
  organizationalUnitDefaultPrograms,
  organizationalUnits,
} from "@/data/mock/organizationalUnits";

import type { OrganizationalUnitDetail } from "../model/organizationalUnitDetail";

function toSummary(detail: OrganizationalUnitDetail) {
  return {
    code: detail.code,
    description: detail.description,
    head: detail.head,
    id: detail.id,
    isActive: detail.isActive,
    name: detail.name,
    type: detail.type,
  };
}

function buildDetail(unit: (typeof organizationalUnits)[number]): OrganizationalUnitDetail {
  const program = organizationalUnitDefaultPrograms[unit.id];

  return {
    ...structuredClone(unit),
    careers: [],
    defaultProgram: program ? { id: program.id, name: program.name, status: program.status } : null,
  };
}

export function createMockOrganizationalUnitsAdapter(): OrganizationalUnitsAdapter {
  const units = organizationalUnits.map(buildDetail);
  const busy = new Map<string, boolean>(
    Object.entries(organizationalUnitDefaultPrograms).map(([id, program]) => [
      id,
      program.hasScheduledActivities,
    ]),
  );

  function find(unitId: string) {
    return units.find((candidate) => candidate.id === unitId);
  }

  return {
    createOrganizationalUnit(request) {
      if (units.some((unit) => unit.code.toLowerCase() === request.code.toLowerCase())) {
        return Promise.reject(
          new ApiError("La operacion entra en conflicto con el estado actual.", 409),
        );
      }

      const detail: OrganizationalUnitDetail = {
        ...request,
        careers: [],
        defaultProgram: {
          id: `program-${request.code.toLowerCase()}`,
          name: "Agenda permanente",
          status: "ACTIVE",
        },
        head: null,
        id: `unit-${request.code.toLowerCase()}`,
        isActive: true,
      };
      units.push(detail);
      busy.set(detail.id, false);
      return Promise.resolve(structuredClone(detail));
    },
    deactivateOrganizationalUnit(unitId) {
      const unit = find(unitId);
      if (!unit) return Promise.reject(new ApiError("No se encontro el recurso solicitado.", 404));
      if (busy.get(unitId)) {
        return Promise.reject(
          new ApiError("La operacion entra en conflicto con el estado actual.", 409),
        );
      }

      unit.isActive = false;
      if (unit.defaultProgram) unit.defaultProgram.status = "ARCHIVED";
      return Promise.resolve(structuredClone(unit));
    },
    getOrganizationalUnit(unitId) {
      const unit = find(unitId);
      if (!unit) return Promise.reject(new ApiError("No se encontro el recurso solicitado.", 404));
      return Promise.resolve(structuredClone(unit));
    },
    /**
     * Sin filtro devuelve toda la coleccion, a diferencia del contrato real, que omite las
     * inactivas: el panel de unidades y sus tests dependen de ese comportamiento historico. Solo
     * el filtro explicito `inactive` recorta la lista; `all` y el default son equivalentes.
     */
    loadOrganizationalUnits: (filters = {}) => {
      const summaries = structuredClone(units).map(toSummary);

      return Promise.resolve(
        filters.isActive === "inactive" ? summaries.filter((unit) => !unit.isActive) : summaries,
      );
    },
    reactivateOrganizationalUnit(unitId) {
      const unit = find(unitId);
      if (!unit) return Promise.reject(new ApiError("No se encontro el recurso solicitado.", 404));
      unit.isActive = true;
      if (unit.defaultProgram) unit.defaultProgram.status = "ACTIVE";
      return Promise.resolve(structuredClone(unit));
    },
    updateOrganizationalUnit(unitId, request) {
      const unit = find(unitId);
      if (!unit) return Promise.reject(new ApiError("No se encontro el recurso solicitado.", 404));
      if (request.name !== undefined) unit.name = request.name;
      if (request.description !== undefined) unit.description = request.description;
      return Promise.resolve(structuredClone(unit));
    },
  };
}
