import { useEffect, useState } from "react";
import type { UserScopePermission } from "../model/userScopes";

/** Reevalúa al llegar a una frontera temporal, sin polling de render ni timers para permisos ilimitados. */
export function useAuthorizationTime(permissions: readonly UserScopePermission[]): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const current = Date.now();
    const boundaries = permissions
      .flatMap((permission) => [permission.validFrom, permission.validUntil])
      .filter((value): value is string => value !== null)
      .map(Date.parse)
      .filter((value) => value > now);
    if (!boundaries.length) return;
    const timer = window.setTimeout(
      () => setNow(Date.now()),
      Math.max(0, Math.min(Math.min(...boundaries) - current + 1, 2_147_483_647)),
    );
    return () => window.clearTimeout(timer);
  }, [permissions, now]);
  return now;
}
