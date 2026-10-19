import type { ClassroomType } from "@/types/domain";

export const classroomTypeLabels: Record<ClassroomType, string> = {
  CLASSROOM: "Aula",
  CONFERENCE_ROOM: "Sala de conferencias",
  LABORATORY: "Laboratorio",
};

/**
 * Amenidades que ya aparecen en el catalogo de demostracion.
 *
 * El contrato las declara como `array` de `string` y no publica un catalogo, asi que la lista es
 * una traduccion de conveniencia, no una enumeracion cerrada: una amenidad desconocida se muestra
 * tal cual la envia el backend en lugar de ocultarse o inventarse una etiqueta.
 */
const amenityLabels: Record<string, string> = {
  desks: "Escritorios",
  projector: "Proyector",
  "smart-board": "Smart board",
  tables: "Mesas",
  whiteboard: "Pizarra",
};

export function resolveAmenityLabel(amenity: string): string {
  return amenityLabels[amenity] ?? amenity;
}
