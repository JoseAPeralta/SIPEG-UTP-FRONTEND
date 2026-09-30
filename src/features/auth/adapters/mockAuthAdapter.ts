import type { AuthAdapter, ProfileUpdateRequest } from "@/app/adapters/contracts";
import { ApiError } from "@/app/adapters/http/apiClient";
import { mockAuthenticatedUser, mockAuthTokens } from "@/data/mock/auth";
import { mockActivityCatalog, mockOperationsReadModel } from "@/data/mock";
import type {
  AuthenticatedUser,
  Career,
  OrganizationalUnit,
  OrganizationReference,
} from "@/types/domain";

import {
  isValidEmail,
  PASSWORD_RESET_MAX_LENGTH,
  PASSWORD_RESET_MIN_LENGTH,
} from "../model/passwordRecoveryValidation";

export const MOCK_AUTH_EMAIL = mockAuthenticatedUser.email;
export const MOCK_AUTH_PASSWORD = "sipeg-demo";

const OTROS_CAREER_CODE = "OTROS";

function toReference(source: Career | OrganizationalUnit): OrganizationReference {
  return { code: source.code, id: source.id, name: source.name };
}

function findActiveUnit(unitId: string): OrganizationalUnit | undefined {
  return mockActivityCatalog.organizationalUnits.find(
    (unit) => unit.id === unitId && unit.isActive,
  );
}

function findCareer(careerId: string): Career | undefined {
  return mockOperationsReadModel.careers.find((career) => career.id === careerId);
}

function findCareerByCode(code: string): Career | undefined {
  return mockOperationsReadModel.careers.find((career) => career.code === code);
}

/**
 * Applies an allowlisted profile patch to the current mock profile, mirroring the backend rules the
 * contract documents. Returns `null` when the request is not valid, so the caller can answer with a
 * validation failure. Server-controlled attributes are never read from the request, which keeps the
 * mock honest about mass assignment even for malformed runtime callers.
 */
function applyProfileUpdate(
  current: AuthenticatedUser,
  request: ProfileUpdateRequest,
): AuthenticatedUser | null {
  const next: AuthenticatedUser = { ...current };

  if (request.firstName !== undefined) {
    next.firstName = request.firstName;
  }

  if (request.lastName !== undefined) {
    next.lastName = request.lastName;
  }

  if (request.unitId === null) {
    const otros = findCareerByCode(OTROS_CAREER_CODE);

    if (!otros || (request.careerId !== undefined && request.careerId !== otros.id)) {
      return null;
    }

    return { ...next, career: toReference(otros), unit: null };
  }

  if (request.unitId !== undefined) {
    const unit = findActiveUnit(request.unitId);

    if (!unit) {
      return null;
    }

    next.unit = toReference(unit);
  }

  if (request.careerId !== undefined) {
    const career = findCareer(request.careerId);

    if (!career) {
      return null;
    }

    const effectiveUnitId = request.unitId ?? current.unit?.id ?? null;

    if (career.unitId !== null && effectiveUnitId !== null && career.unitId !== effectiveUnitId) {
      return null;
    }

    if (career.unitId !== null && effectiveUnitId === null) {
      const derived = findActiveUnit(career.unitId);

      if (!derived) {
        return null;
      }

      next.unit = toReference(derived);
    }

    next.career = toReference(career);
  }

  return next;
}

export function createMockAuthAdapter(): AuthAdapter {
  let currentPassword = MOCK_AUTH_PASSWORD;
  let profile: AuthenticatedUser = { ...mockAuthenticatedUser };

  return {
    changePassword(accessToken, { currentPassword: providedPassword, newPassword, refreshToken }) {
      if (accessToken !== mockAuthTokens.accessToken) {
        return Promise.reject(new ApiError("Su sesion no esta autorizada.", 401));
      }

      if (refreshToken !== mockAuthTokens.refreshToken) {
        return Promise.reject(new ApiError("La solicitud no es valida.", 400));
      }

      if (
        providedPassword !== currentPassword ||
        newPassword.length < PASSWORD_RESET_MIN_LENGTH ||
        newPassword.length > PASSWORD_RESET_MAX_LENGTH
      ) {
        return Promise.reject(new ApiError("La solicitud no es valida.", 400));
      }

      currentPassword = newPassword;

      return Promise.resolve();
    },

    loadCurrentUser(accessToken) {
      if (accessToken !== mockAuthTokens.accessToken) {
        return Promise.reject(new ApiError("Su sesion no esta autorizada.", 401));
      }

      return Promise.resolve({ ...profile });
    },

    login(credentials) {
      if (
        credentials.email.trim().toLowerCase() !== MOCK_AUTH_EMAIL.toLowerCase() ||
        credentials.password !== currentPassword
      ) {
        return Promise.reject(new ApiError("El correo o la contrasena no son correctos.", 401));
      }

      return Promise.resolve(mockAuthTokens);
    },

    logout: () => Promise.resolve(),

    refresh(refreshToken) {
      if (refreshToken !== mockAuthTokens.refreshToken) {
        return Promise.reject(new ApiError("Su sesion no esta autorizada.", 401));
      }

      return Promise.resolve(mockAuthTokens);
    },

    requestPasswordReset({ email }) {
      if (!isValidEmail(email)) {
        return Promise.reject(new ApiError("La solicitud no es valida.", 400));
      }

      return Promise.resolve();
    },

    resetPassword({ newPassword, token }) {
      if (
        !token.trim() ||
        newPassword.length < PASSWORD_RESET_MIN_LENGTH ||
        newPassword.length > PASSWORD_RESET_MAX_LENGTH
      ) {
        return Promise.reject(new ApiError("La solicitud no es valida.", 400));
      }

      return Promise.resolve();
    },

    verifyEmail(token) {
      if (!token.trim()) {
        return Promise.reject(new ApiError("El token de verificacion es invalido.", 400));
      }

      return Promise.resolve();
    },

    updateCurrentUser(accessToken, request) {
      if (accessToken !== mockAuthTokens.accessToken) {
        return Promise.reject(new ApiError("Su sesion no esta autorizada.", 401));
      }

      const updated = applyProfileUpdate(profile, request);

      if (!updated) {
        return Promise.reject(new ApiError("La solicitud no es valida.", 400));
      }

      profile = updated;

      return Promise.resolve({ ...profile });
    },
  };
}
