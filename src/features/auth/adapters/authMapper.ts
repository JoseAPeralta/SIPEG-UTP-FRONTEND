import type {
  AuthenticatedUser,
  AuthTokens,
  GlobalRole,
  OrganizationReference,
} from "@/types/domain";

export class AuthMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthMappingError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new AuthMappingError(`${path} debe ser un objeto`);
  }

  return value;
}

function readString(record: Record<string, unknown>, key: string, path: string): string {
  const value = record[key];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AuthMappingError(`${path}.${key} debe ser un texto no vacio`);
  }

  return value;
}

function readDateTime(record: Record<string, unknown>, key: string, path: string): string {
  const value = readString(record, key, path);

  if (Number.isNaN(Date.parse(value))) {
    throw new AuthMappingError(`${path}.${key} debe ser una fecha ISO valida`);
  }

  return value;
}

function readGlobalRole(record: Record<string, unknown>, path: string): GlobalRole {
  const role = readString(record, "globalRole", path);

  if (role !== "ADMIN" && role !== "USER") {
    throw new AuthMappingError(`${path}.globalRole no pertenece al contrato`);
  }

  return role;
}

function mapOrganizationReference(value: unknown, path: string): OrganizationReference | null {
  if (value === null) {
    return null;
  }

  const record = readRecord(value, path);

  return {
    code: readString(record, "code", path),
    id: readString(record, "id", path),
    name: readString(record, "name", path),
  };
}

export function readAuthEnvelopeData(payload: unknown, path: string): unknown {
  const record = readRecord(payload, path);

  if (record["success"] !== true) {
    throw new AuthMappingError(`${path}.success debe ser true`);
  }

  readString(record, "message", path);

  if (!("data" in record)) {
    throw new AuthMappingError(`${path}.data es obligatorio`);
  }

  return record["data"];
}

export function readEmptySuccessData(payload: unknown, path: string): void {
  const record = readRecord(readAuthEnvelopeData(payload, path), `${path}.data`);

  if (Object.keys(record).length > 0) {
    throw new AuthMappingError(`${path}.data debe ser un objeto vacio`);
  }
}

export function mapAuthTokens(value: unknown, path: string): AuthTokens {
  const record = readRecord(value, path);
  const tokenType = readString(record, "tokenType", path);

  if (tokenType !== "Bearer") {
    throw new AuthMappingError(`${path}.tokenType debe ser Bearer`);
  }

  return {
    accessToken: readString(record, "accessToken", path),
    accessTokenExpiresAt: readDateTime(record, "accessTokenExpiresAt", path),
    refreshToken: readString(record, "refreshToken", path),
    refreshTokenExpiresAt: readDateTime(record, "refreshTokenExpiresAt", path),
    tokenType,
  };
}

export function mapAuthenticatedUser(value: unknown, path: string): AuthenticatedUser {
  const record = readRecord(value, path);

  return {
    career: mapOrganizationReference(record["career"], `${path}.career`),
    email: readString(record, "email", path),
    firstName: readString(record, "firstName", path),
    globalRole: readGlobalRole(record, path),
    id: readString(record, "id", path),
    identificationNumber: readString(record, "identificationNumber", path),
    lastName: readString(record, "lastName", path),
    unit: mapOrganizationReference(record["unit"], `${path}.unit`),
  };
}
