import type { EventProgramListItem } from "./eventProgramList";

export type EventProgramLifecycleAction = "archive" | "edit" | "publish" | "reactivate";

/**
 * Acciones que la UI puede ofrecer para un programa. Evita controles incompatibles (editar un
 * archivado, publicar algo ya publicado, archivar la agenda permanente) y deja los rechazos de
 * negocio en manos del contrato. La agenda permanente sin archivar solo se edita: su ciclo de vida
 * pertenece a la unidad y un archivado no se reactiva por esta vía.
 */
export function eventProgramLifecycleActions(
  program: Pick<EventProgramListItem, "isDefault" | "status">,
): EventProgramLifecycleAction[] {
  if (program.isDefault) return program.status === "ARCHIVED" ? [] : ["edit"];
  if (program.status === "ARCHIVED") return ["reactivate"];
  if (program.status === "DRAFT") return ["edit", "publish", "archive"];

  return ["edit", "archive"];
}
