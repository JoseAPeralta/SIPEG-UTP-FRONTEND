import type { AdminUserFilters, UsersAdapter } from "@/app/adapters/contracts";
import { ApiError } from "@/app/adapters/http/apiClient";
import { careers } from "@/data/mock/careers";
import { organizationalUnits } from "@/data/mock/organizationalUnits";
import { users } from "@/data/mock/users";

import type { AdminUser } from "../model/adminUser";
import type { CreateAdminUserRequest, UpdateAdminUserRequest } from "../model/userRequests";

const PAGE_SIZE = 20;
const ACTING_ADMINISTRATOR = "user-1";
const OTHERS_CAREER = { code: "OTROS", id: "otros", name: "Otros" };

function referenceOf(unitId: string) {
  const unit = organizationalUnits.find(
    (candidate) => candidate.id === unitId && candidate.isActive,
  );

  return unit ? { code: unit.code, id: unit.id, name: unit.name } : null;
}

function careerReference(careerId: string, unitId: string | null) {
  const career = careers.find(
    (candidate) => candidate.id === careerId && (unitId === null || candidate.unitId === unitId),
  );

  return career ? { code: career.code, id: career.id, name: career.name } : null;
}

function conflict(): never {
  throw new ApiError("La operacion entra en conflicto con el estado actual.", 409);
}

function invalid(): never {
  throw new ApiError("La solicitud no es valida.", 400);
}

/** Convierte un fallo sincrono en una promesa rechazada, como haria el adapter HTTP. */
function run<T>(operation: () => T): Promise<T> {
  try {
    return Promise.resolve(operation());
  } catch (error) {
    return Promise.reject(error instanceof Error ? error : new Error("operacion fallida"));
  }
}

/**
 * Catalogo mutable de demostracion. Reproduce las reglas contractuales que la UI debe explicar:
 * duplicados, relaciones unidad-carrera invalidas y las salvaguardas del administrador en funciones
 * y del ultimo administrador activo. `user-1` representa la cuenta que opera el panel.
 */
export function createMockUsersAdapter(): UsersAdapter {
  const catalog: AdminUser[] = structuredClone(users);

  function matchesFilters(user: AdminUser, filters: AdminUserFilters) {
    if (filters.globalRole && user.globalRole !== filters.globalRole) return false;
    if (filters.isActive !== undefined && user.isActive !== filters.isActive) return false;
    if (filters.unitId && user.unit?.id !== filters.unitId) return false;
    if (filters.careerId && user.career?.id !== filters.careerId) return false;
    if (filters.q) {
      const haystack =
        `${user.firstName} ${user.lastName} ${user.email} ${user.identificationNumber}`.toLowerCase();
      if (!haystack.includes(filters.q.trim().toLowerCase())) return false;
    }

    return true;
  }

  function find(userId: string) {
    const user = catalog.find((candidate) => candidate.id === userId);
    if (!user) throw new ApiError("No se encontro el recurso solicitado.", 404);

    return user;
  }

  return {
    createUser(request: CreateAdminUserRequest) {
      return run(() => {
        if (
          catalog.some(
            (user) =>
              user.email.toLowerCase() === request.email.toLowerCase() ||
              user.identificationNumber === request.identificationNumber,
          )
        ) {
          conflict();
        }

        let unit: AdminUser["unit"] = null;
        let career: AdminUser["career"] = null;

        if (request.unitId !== null) {
          unit = referenceOf(request.unitId);
          if (!unit) invalid();
        }

        if (request.careerId !== undefined) {
          career = careerReference(request.careerId, request.unitId);
          if (!career) invalid();
        }

        const created: AdminUser = {
          career,
          email: request.email,
          firstName: request.firstName,
          globalRole: "USER",
          id: `user-${catalog.length + 1}`,
          identificationNumber: request.identificationNumber,
          isActive: true,
          lastName: request.lastName,
          unit,
        };
        catalog.push(created);

        return structuredClone(created);
      });
    },
    getUser(userId: string) {
      return run(() => structuredClone(find(userId)));
    },
    loadUsers: () => Promise.resolve(structuredClone(catalog)),
    loadUsersPage(filters: AdminUserFilters, page: number) {
      return run(() => {
        const filtered = catalog.filter((user) => matchesFilters(user, filters));
        const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
        const start = (Math.max(1, page) - 1) * PAGE_SIZE;

        return {
          items: structuredClone(filtered.slice(start, start + PAGE_SIZE)),
          limit: PAGE_SIZE,
          page,
          total: filtered.length,
          totalPages,
        };
      });
    },
    updateUser(userId: string, request: UpdateAdminUserRequest) {
      return run(() => {
        const user = find(userId);

        if (userId === ACTING_ADMINISTRATOR) {
          if (request.isActive === false || request.globalRole === "USER") conflict();
        }
        if (request.globalRole === "ADMIN" && (request.isActive === false || !user.isActive)) {
          conflict();
        }

        if (request.unitId !== undefined) {
          if (request.unitId === null) {
            user.unit = null;
            user.career = { ...OTHERS_CAREER };
          } else {
            const unit = referenceOf(request.unitId);
            if (!unit) invalid();
            user.unit = unit;

            if (request.careerId !== undefined) {
              const career = careerReference(request.careerId, request.unitId);
              if (!career) invalid();
              user.career = career;
            } else {
              user.career = careerReference(user.career?.id ?? "", request.unitId) ?? {
                ...OTHERS_CAREER,
              };
            }
          }
        } else if (request.careerId !== undefined) {
          const career = careerReference(request.careerId, user.unit?.id ?? null);
          if (!career) invalid();
          user.career = career;
        }

        if (request.globalRole !== undefined) user.globalRole = request.globalRole;
        if (request.isActive !== undefined) user.isActive = request.isActive;

        return structuredClone(user);
      });
    },
  };
}
