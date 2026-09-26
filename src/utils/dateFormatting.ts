import type { Activity, EventProgram } from "@/types/domain";

export function getActivityTimestamp(activity: Pick<Activity, "date" | "startTime">) {
  return new Date(`${activity.date}T${activity.startTime}:00`).getTime();
}

export function formatActivityDate(date: string) {
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

export function formatDateTime(dateTime: string) {
  return new Intl.DateTimeFormat("es-PA", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateTime));
}

export function formatProgramDateRange(program: Pick<EventProgram, "endDate" | "startDate">) {
  if (!program.startDate || !program.endDate) {
    return null;
  }

  return formatDateRange(program.startDate, program.endDate);
}
