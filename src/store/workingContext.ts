import { create } from "zustand";

import type { WorkingContext } from "@/types/domain";

type WorkingContextState = {
  clearWorkingContext: () => void;
  /** Anuncio en memoria de una seleccion retirada por reconciliacion; nunca se persiste. */
  contextRevokedNotice: boolean;
  noteRevokedSelection: () => void;
  setWorkingContext: (context: WorkingContext | null) => void;
  workingContext: WorkingContext | null;
};

export const useWorkingContextStore = create<WorkingContextState>((set) => ({
  clearWorkingContext: () => set({ contextRevokedNotice: false, workingContext: null }),
  contextRevokedNotice: false,
  noteRevokedSelection: () => set({ contextRevokedNotice: true, workingContext: null }),
  setWorkingContext: (workingContext) => set({ contextRevokedNotice: false, workingContext }),
  workingContext: null,
}));
