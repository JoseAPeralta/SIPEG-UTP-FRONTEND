import { create } from "zustand";

import type { AuthenticatedUser, AuthTokens } from "@/types/domain";

export type SessionStatus = "anonymous" | "authenticated" | "restoring";

type SessionState = {
  clearSession: () => void;
  currentUser: AuthenticatedUser | null;
  finishRestoration: () => void;
  setSession: (session: { currentUser: AuthenticatedUser; tokens: AuthTokens }) => void;
  status: SessionStatus;
  tokens: AuthTokens | null;
};

export const useSessionStore = create<SessionState>()((set) => ({
  clearSession: () => set({ currentUser: null, status: "anonymous", tokens: null }),
  currentUser: null,
  finishRestoration: () => set({ status: "anonymous" }),
  setSession: ({ currentUser, tokens }) => set({ currentUser, status: "authenticated", tokens }),
  status: "restoring",
  tokens: null,
}));
