import type { ClassroomAvailability } from "@/features/classrooms/model/classroomDetail";

/**
 * Disponibilidad semanal del catalogo de demostracion.
 *
 * El contrato numera los dias de lunes a domingo, y las ventanas de un mismo dia no pueden
 * solaparse. El mock siembra un dia de lunes a viernes mas un bloque contiguo, para que el trabajo
 * con ventanas adyacentes y con solapes tenga un punto de partida verificable.
 */
export const classroomAvailability: Record<string, ClassroomAvailability[]> = {
  "auditorium-01": [
    {
      dayOfWeek: 1,
      endTime: "10:00",
      id: "availability-auditorium-mon-1",
      period: "Mañana",
      startTime: "08:00",
    },
    {
      dayOfWeek: 2,
      endTime: "12:00",
      id: "availability-auditorium-tue-1",
      period: "Mañana",
      startTime: "09:00",
    },
  ],
  "lab-01": [
    {
      dayOfWeek: 1,
      endTime: "12:00",
      id: "availability-lab-mon-1",
      period: "Mañana",
      startTime: "08:00",
    },
    {
      dayOfWeek: 1,
      endTime: "14:00",
      id: "availability-lab-mon-2",
      period: "Tarde",
      startTime: "12:00",
    },
    {
      dayOfWeek: 3,
      endTime: "17:00",
      id: "availability-lab-wed-1",
      period: "Tarde",
      startTime: "14:00",
    },
  ],
  "aula-10": [
    {
      dayOfWeek: 1,
      endTime: "09:00",
      id: "availability-aula10-mon-1",
      period: "Primera hora",
      startTime: "07:00",
    },
    {
      dayOfWeek: 4,
      endTime: "10:00",
      id: "availability-aula10-thu-1",
      period: "Mañana",
      startTime: "08:00",
    },
    {
      dayOfWeek: 5,
      endTime: "13:00",
      id: "availability-aula10-fri-1",
      period: null,
      startTime: "09:00",
    },
  ],
};
