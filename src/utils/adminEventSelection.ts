import { largeEvents, smallEvents } from "@/data/sipeg";

export type AdminEventOption = {
  id: string;
  label: string;
  type: "large" | "small";
};

export function getAdminEventOptions(): AdminEventOption[] {
  const largeOptions: AdminEventOption[] = largeEvents.map((event) => ({
    id: event.id,
    label: event.name,
    type: "large",
  }));
  const smallOptions: AdminEventOption[] = smallEvents.map((event) => ({
    id: event.id,
    label: event.name,
    type: "small",
  }));

  return [...largeOptions, ...smallOptions];
}

export function getRelatedSmallEventIds(selectedEventId: string | null): string[] {
  if (!selectedEventId) {
    return [];
  }

  if (smallEvents.some((event) => event.id === selectedEventId)) {
    return [selectedEventId];
  }

  return smallEvents
    .filter((event) => event.parentEventId === selectedEventId)
    .map((event) => event.id);
}

export function getSelectedEventLabel(selectedEventId: string | null): string | null {
  if (!selectedEventId) {
    return null;
  }

  return getAdminEventOptions().find((event) => event.id === selectedEventId)?.label ?? null;
}
