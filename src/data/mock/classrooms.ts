import type { Classroom } from "@/types/domain";

export const classrooms: Classroom[] = [
  {
    amenities: ["projector", "smart-board", "whiteboard"],
    building: "Edificio de Aulas",
    capacity: 120,
    floor: 1,
    id: "auditorium-01",
    isActive: true,
    name: "Auditorio Roberto Barraza",
    type: "CLASSROOM",
  },
  {
    amenities: ["projector", "desks", "whiteboard"],
    building: "Laboratorios de Ingenieria",
    capacity: 34,
    floor: 2,
    id: "lab-01",
    isActive: true,
    name: "Laboratorio de Analitica",
    type: "LABORATORY",
  },
  {
    amenities: ["tables", "whiteboard"],
    building: "Edificio de Aulas",
    capacity: 48,
    floor: 1,
    id: "aula-10",
    isActive: true,
    name: "Aula 10B",
    type: "CLASSROOM",
  },
];
