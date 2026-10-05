/**
 * Dias de la semana en el orden institucional de lunes a domingo, que es el orden ISO que usa el
 * contrato (`1` a `7`). El array esta ordenado a proposito: la vista agrupa por dia y no debe
 * decidir el orden en cada render.
 */
export const weekDayLabels: readonly { day: number; label: string }[] = [
  { day: 1, label: "Lunes" },
  { day: 2, label: "Martes" },
  { day: 3, label: "Miercoles" },
  { day: 4, label: "Jueves" },
  { day: 5, label: "Viernes" },
  { day: 6, label: "Sabado" },
  { day: 7, label: "Domingo" },
];

export function weekDayLabel(dayOfWeek: number): string {
  return weekDayLabels.find((weekDay) => weekDay.day === dayOfWeek)?.label ?? `Dia ${dayOfWeek}`;
}
