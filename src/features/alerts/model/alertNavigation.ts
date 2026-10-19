import type { UserScope } from "@/features/collaboration";
import { operationalScopePath } from "@/features/collaboration/navigation";

import type { AlertTarget } from "./alert";

export type AlertDestination = { label: string; to: string };

/**
 * Resuelve el unico destino navegable de una alerta.
 *
 * Un objetivo recibido no autoriza: el scope debe aparecer en el descubrimiento, que ya exige un
 * permiso efectivo. Propuestas y certificados no tienen ruta de detalle todavia y quedan sin enlace.
 */
export function resolveAlertDestination(
  target: AlertTarget,
  scopes: readonly UserScope[],
): AlertDestination | null {
  if (target.kind === "PROPOSAL" || target.kind === "CERTIFICATE") {
    return null;
  }

  const type = target.kind === "EVENT_PROGRAM" ? "program" : "activity";
  const scope = scopes.find((item) => item.type === type && item.id === target.id);

  if (!scope) {
    return null;
  }

  return {
    label: type === "program" ? "Ver contexto del programa" : "Ver contexto de la actividad",
    to: operationalScopePath({ id: scope.id, type }),
  };
}
