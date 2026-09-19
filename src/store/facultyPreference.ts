import { create } from "zustand";

import type { FacultyFilter } from "@utils/eventFilters";

type FacultyPreferenceState = {
  selectedFacultyId: FacultyFilter;
  setSelectedFacultyId: (facultyId: FacultyFilter) => void;
};

export const useFacultyPreferenceStore = create<FacultyPreferenceState>((set) => ({
  selectedFacultyId: "all",
  setSelectedFacultyId: (facultyId) => set({ selectedFacultyId: facultyId }),
}));
