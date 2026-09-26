import { create } from "zustand";

import type { WorkingContext } from "@/types/domain";

type WorkingContextState = {
  clearWorkingContext: () => void;
  setWorkingContext: (context: WorkingContext | null) => void;
  workingContext: WorkingContext | null;
};

export const useWorkingContextStore = create<WorkingContextState>((set) => ({
  clearWorkingContext: () => set({ workingContext: null }),
  setWorkingContext: (workingContext) => set({ workingContext }),
  workingContext: null,
}));
