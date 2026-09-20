import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { User } from "@/types/domain";

type SessionState = {
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      currentUser: null,
      login: (user) => set({ currentUser: user }),
      logout: () => set({ currentUser: null }),
    }),
    {
      name: "sipeg-session",
      partialize: (state) => ({ currentUser: state.currentUser }),
    },
  ),
);
