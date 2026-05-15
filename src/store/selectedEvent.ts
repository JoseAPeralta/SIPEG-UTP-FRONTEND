import { create } from "zustand";

type SelectedEventState = {
  selectedEventId: string | null;
  setSelectedEventId: (eventId: string | null) => void;
};

export const useSelectedEventStore = create<SelectedEventState>((set) => ({
  selectedEventId: null,
  setSelectedEventId: (eventId) => set({ selectedEventId: eventId }),
}));
