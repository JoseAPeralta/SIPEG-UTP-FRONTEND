import type { GlobalRole } from "@/types/domain";

/**
 * Resolves the destination that matches the authenticated global role. Administrators continue in the
 * operational panel; every other role lands on the personal area, so a standard user never reaches an
 * administrative screen, neither after login nor through a rejected guard.
 */
export function resolveAuthLandingPath(globalRole: GlobalRole): "/admin" | "/perfil" {
  return globalRole === "ADMIN" ? "/admin" : "/perfil";
}
