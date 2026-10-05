import { create } from "zustand";

import type { AuthenticatedUser, AuthTokens, SessionEndReason } from "@/types/domain";

export type SessionStatus = "anonymous" | "authenticated" | "restoring";

type SessionState = {
  /**
   * Advances the generation for a purge that is not a plain clear or end, such as a login that
   * replaces the current session with the same identity.
   */
  advanceSessionGeneration: () => void;
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
  /**
   * Identifica la instancia de sesion viva en memoria. Avanza cuando una identidad distinta inicia
   * sesion y cuando la actual se limpia o termina, de modo que un callback que sobrevive a su sesion
   * puede reconocer que ya no pertenece a la actual aunque la cuenta siguiente use el mismo `id`.
   * Nunca se persiste ni forma parte de una clave de Query.
   */
  sessionGeneration: number;
  setSession: (session: { currentUser: AuthenticatedUser; tokens: AuthTokens }) => void;
  status: SessionStatus;
  tokens: AuthTokens | null;
};

export const useSessionStore = create<SessionState>()((set) => ({
  advanceSessionGeneration: () =>
    set((state) => ({ sessionGeneration: state.sessionGeneration + 1 })),
  clearSession: () =>
    set((state) => ({
      currentUser: null,
      sessionEndReason: null,
      sessionGeneration: state.sessionGeneration + 1,
      status: "anonymous",
      tokens: null,
    })),
  currentUser: null,
  endSession: (reason) =>
    set((state) => ({
      currentUser: null,
      sessionEndReason: reason,
      sessionGeneration: state.sessionGeneration + 1,
      status: "anonymous",
      tokens: null,
    })),
  finishRestoration: () =>
    set((state) => (state.status === "restoring" ? { status: "anonymous" } : state)),
  replaceCurrentUser: (currentUser) =>
    set((state) => (state.currentUser?.id === currentUser.id ? { currentUser } : state)),
  sessionEndReason: null,
  sessionGeneration: 0,
  setSession: ({ currentUser, tokens }) =>
    set((state) => ({
      currentUser,
      sessionEndReason: null,
      sessionGeneration:
        state.currentUser?.id === currentUser.id
          ? state.sessionGeneration
          : state.sessionGeneration + 1,
      status: "authenticated",
      tokens,
    })),
  status: "restoring",
  tokens: null,
}));
