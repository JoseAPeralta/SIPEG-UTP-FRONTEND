import type { CollaborationScope, OwnPermissions } from "../model/ownPermissions";
import { data, object, list, effectivePermission, invalidPayload } from "./collaborationReaders";

export function mapOwnPermissions(payload: unknown, expected: CollaborationScope): OwnPermissions {
  const value = data(payload);
  const scope = object(value["scope"]);
  if (scope["id"] !== expected.id || scope["type"] !== expected.type) return invalidPayload();
  return {
    scope: { ...expected },
    permissions: list(value["permissions"]).map(effectivePermission),
  };
}
