import { create } from "zustand";

import type { AuthenticatedUser, AuthTokens, SessionEndReason } from "@/types/domain";

export type SessionStatus = "anonymous" | "authenticated" | "restoring";

type SessionState = {
  clearSession: () => void;
  currentUser: AuthenticatedUser | null;
  /**
   * Drops the in-memory identity because the server stopped accepting it, and records why so the
   * login screen can explain the interruption. The reason never leaves memory: it is not a credential
   * and it is not persisted.
   */
  endSession: (reason: SessionEndReason) => void;
  finishRestoration: () => void;
  /**
   * Replaces only the authenticated profile after a successful profile update. Tokens, status and
   * the refresh credential are preserved so a concurrent token rotation is never reverted, and the
   * update is discarded when the response belongs to a different identity, which happens when the
   * session was closed or replaced while the request was in flight.
   */
  replaceCurrentUser: (currentUser: AuthenticatedUser) => void;
  sessionEndReason: SessionEndReason | null;
  setSession: (session: { currentUser: AuthenticatedUser; tokens: AuthTokens }) => void;
  status: SessionStatus;
  tokens: AuthTokens | null;
};

export const useSessionStore = create<SessionState>()((set) => ({
  clearSession: () =>
    set({ currentUser: null, sessionEndReason: null, status: "anonymous", tokens: null }),
  currentUser: null,
  endSession: (reason) =>
    set({ currentUser: null, sessionEndReason: reason, status: "anonymous", tokens: null }),
  finishRestoration: () =>
    set((state) => (state.status === "restoring" ? { status: "anonymous" } : state)),
  replaceCurrentUser: (currentUser) =>
    set((state) => (state.currentUser?.id === currentUser.id ? { currentUser } : state)),
  sessionEndReason: null,
  setSession: ({ currentUser, tokens }) =>
    set({ currentUser, sessionEndReason: null, status: "authenticated", tokens }),
  status: "restoring",
  tokens: null,
}));
