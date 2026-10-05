import type { CareersAdapter } from "@/app/adapters/contracts";
import { ApiError } from "@/app/adapters/http/apiClient";
import { careers } from "@/data/mock/careers";
import { organizationalUnits } from "@/data/mock/organizationalUnits";
import { users } from "@/data/mock/users";

function isValidUnit(unitId: string | null) {
  if (unitId === null) return true;
  return organizationalUnits.some(
    (unit) => unit.id === unitId && unit.isActive && unit.type === "FACULTY",
  );
}

export function createMockCareersAdapter(): CareersAdapter {
  const catalog = structuredClone(careers);

  return {
    createCareer(request) {
      if (!isValidUnit(request.unitId)) {
        return Promise.reject(new ApiError("La solicitud no es valida.", 400));
      }
      if (catalog.some((career) => career.code.toLowerCase() === request.code.toLowerCase())) {
        return Promise.reject(
          new ApiError("La operacion entra en conflicto con el estado actual.", 409),
        );
      }
      const career = { ...request, id: request.code.toLowerCase() };
      catalog.push(career);
      return Promise.resolve(structuredClone(career));
    },
    deleteCareer(careerId) {
      const index = catalog.findIndex((career) => career.id === careerId);
      const career = catalog[index];
      if (!career)
        return Promise.reject(new ApiError("No se encontro el recurso solicitado.", 404));
      if (career.code === "OTROS" || users.some((user) => user.career?.id === careerId)) {
        return Promise.reject(
          new ApiError("La operacion entra en conflicto con el estado actual.", 409),
        );
      }
      catalog.splice(index, 1);
      return Promise.resolve();
    },
    loadCareers: () => Promise.resolve(structuredClone(catalog)),
    updateCareer(careerId, request) {
      const career = catalog.find((candidate) => candidate.id === careerId);
      if (!career)
        return Promise.reject(new ApiError("No se encontro el recurso solicitado.", 404));
      if (
        !isValidUnit(request.unitId ?? career.unitId) ||
        (career.code === "OTROS" && (request.code !== undefined || request.unitId !== undefined))
      ) {
        return Promise.reject(new ApiError("La solicitud no es valida.", 400));
      }
      if (request.unitId !== undefined && users.some((user) => user.career?.id === careerId)) {
        return Promise.reject(
          new ApiError("La operacion entra en conflicto con el estado actual.", 409),
        );
      }
      if (
        request.code !== undefined &&
        catalog.some(
          (candidate) =>
            candidate.id !== careerId &&
            candidate.code.toLowerCase() === request.code?.toLowerCase(),
        )
      ) {
        return Promise.reject(
          new ApiError("La operacion entra en conflicto con el estado actual.", 409),
        );
      }
      Object.assign(career, request);
      return Promise.resolve(structuredClone(career));
    },
  };
}
