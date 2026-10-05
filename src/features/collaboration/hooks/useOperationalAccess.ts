import { useUserScopes } from "./useUserScopes";
import { useAuthorizationTime } from "./useAuthorizationTime";
import { hasEffectivePermission } from "../model/operationalCapabilities";
import { PERMISSION_NAMES } from "../model/permissions";

/** Descubrimiento autoritativo; un error nunca conserva una navegación basada en datos obsoletos. */
export function useOperationalAccess() {
  const query = useUserScopes();
  const all = query.scopes ?? [];
  const now = useAuthorizationTime(all.flatMap((scope) => scope.permissions));
  const scopes = query.error
    ? []
    : all.filter((scope) =>
        PERMISSION_NAMES.some((name) => hasEffectivePermission(scope.permissions, name, now)),
      );
  return { ...query, scopes, now };
}
