import { isCollaborationRole } from "../model/permissions";
import type { Collaborator, EffectiveCollaborator, LocalPermission } from "../model/collaborators";
import {
  data,
  object,
  list,
  text,
  instant,
  effectivePermission,
  invalidPayload,
} from "./collaborationReaders";

function localPermission(raw: unknown): LocalPermission {
  const value = object(raw);
  const source = value["source"];
  if (source !== "ROLE_DEFAULT" && source !== "OVERRIDE") return invalidPayload();
  const validFrom = instant(value["validFrom"]);
  const validUntil = instant(value["validUntil"]);
  if (validFrom && validUntil && Date.parse(validFrom) >= Date.parse(validUntil))
    return invalidPayload();
  return { name: text(value["name"]), source, validFrom, validUntil };
}
function base(raw: unknown): Collaborator {
  const value = object(raw);
  const role = value["role"];
  const createdAt = instant(value["createdAt"]);
  if (!isCollaborationRole(role) || createdAt === null) return invalidPayload();
  return {
    userId: text(value["userId"]),
    firstName: text(value["firstName"]),
    lastName: text(value["lastName"]),
    email: text(value["email"]),
    role,
    createdAt,
    permissions: list(value["permissions"]).map(localPermission),
  };
}
export function mapCollaborator(payload: unknown): Collaborator {
  return base(data(payload));
}
export function mapCollaborators(payload: unknown): EffectiveCollaborator[] {
  return list(data(payload)["items"]).map((raw) => {
    const value = object(raw);
    return {
      ...base(value),
      permissions: list(value["permissions"]).map((permission) => {
        const effective = object(permission)["effective"];
        if (typeof effective !== "boolean") return invalidPayload();
        return { ...localPermission(permission), ...effectivePermission(permission), effective };
      }),
    };
  });
}
