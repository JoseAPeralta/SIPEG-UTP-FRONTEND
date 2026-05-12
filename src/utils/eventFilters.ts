import type { FacultyId, SmallEvent } from "@/types/domain";

export type FacultyFilter = "all" | FacultyId;

export function getEventsForFaculty(events: readonly SmallEvent[], facultyId: FacultyFilter) {
  if (facultyId === "all") {
    return [...events];
  }

  return events.filter((event) => event.facultyId === facultyId);
}

export function formatEventDate(date: string) {
  return new Intl.DateTimeFormat("es-PA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export function formatDateRange(startDate: string, endDate: string) {
  const formatter = new Intl.DateTimeFormat("es-PA", {
    day: "numeric",
    month: "short",
  });

  return `${formatter.format(new Date(`${startDate}T00:00:00`))} - ${formatter.format(
    new Date(`${endDate}T00:00:00`),
  )}`;
}
