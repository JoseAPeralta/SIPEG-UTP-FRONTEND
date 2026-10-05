import { create } from "zustand";

export type UnitPreference = "all" | (string & {});

type UnitPreferenceState = {
  selectedUnitId: UnitPreference;
  setSelectedUnitId: (unitId: UnitPreference) => void;
};

export const useUnitPreferenceStore = create<UnitPreferenceState>((set) => ({
  selectedUnitId: "all",
  setSelectedUnitId: (unitId) => set({ selectedUnitId: unitId }),
}));
