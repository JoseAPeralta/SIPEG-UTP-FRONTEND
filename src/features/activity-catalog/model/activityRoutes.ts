import type { ActivityAccessMode } from "./activityAccess";

/** Ruta canonica de la administracion de actividades de un programa. */
export function programActivitiesPath(mode: ActivityAccessMode, programId: string): string {
  return mode === "administration"
    ? `/admin/programas/${encodeURIComponent(programId)}/actividades`
    : `/operaciones/programas/${encodeURIComponent(programId)}/actividades`;
}

/** Ruta canonica del detalle administrativo de una actividad. */
export function activityDetailPath(mode: ActivityAccessMode, activityId: string): string {
  return mode === "administration"
    ? `/admin/actividades/${encodeURIComponent(activityId)}`
    : `/operaciones/actividades/${encodeURIComponent(activityId)}/detalle`;
}

/** Ruta de regreso al listado de programas de cada area. */
export function programsHomePath(mode: ActivityAccessMode): string {
  return mode === "administration" ? "/admin/programas" : "/operaciones";
}
