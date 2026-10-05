import { CollaborationMappingError } from "./userScopesMapper";
import { isPermissionOrigin } from "../model/userScopes";
import type { UserScopePermission } from "../model/userScopes";

export function invalidPayload(): never {
  throw new CollaborationMappingError("La respuesta de colaboración no es válida.");
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalidPayload();
  return value as Record<string, unknown>;
}
export function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return invalidPayload();
  return value;
}
export function list(value: unknown): unknown[] {
  if (!Array.isArray(value)) return invalidPayload();
  return value;
}
export function instant(value: unknown): string | null {
  if (value === null) return null;
  const result = text(value);
  if (
    !/^\d{4}-\d{2}-\d{2}T/.test(result) ||
    !/(Z|[+-]\d{2}:\d{2})$/.test(result) ||
    !Number.isFinite(Date.parse(result))
  )
    return invalidPayload();
  return result;
}
export function data(payload: unknown): Record<string, unknown> {
  const envelope = object(payload);
  if (envelope["success"] !== true) return invalidPayload();
  text(envelope["message"]);
  return object(envelope["data"]);
}
export function effectivePermission(raw: unknown): UserScopePermission {
  const value = object(raw);
  const origin = value["origin"];
  if (!isPermissionOrigin(origin)) return invalidPayload();
  const validFrom = instant(value["validFrom"]);
  const validUntil = instant(value["validUntil"]);
  if (validFrom && validUntil && Date.parse(validFrom) >= Date.parse(validUntil))
    return invalidPayload();
  return { name: text(value["name"]), origin, validFrom, validUntil };
}
