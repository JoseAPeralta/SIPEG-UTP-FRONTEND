import type { QueryClient } from "@tanstack/react-query";

import { clearPersistedQueryCache } from "@/app/query/cache";
import { useSessionStore } from "@/store/session";
import { useUnitPreferenceStore } from "@/store/unitPreference";
import { useWorkingContextStore } from "@/store/workingContext";
import type { SessionEndReason } from "@/types/domain";

const LEGACY_SESSION_STORAGE_KEY = "sipeg-session";

/**
 * Removes every trace of the current identity: the persisted public query cache, the query client,
 * the working context and the unit preference. The reason is recorded in memory only, so the login
 * screen can explain the interruption without persisting anything.
 *
 * There is no refresh credential to clear here: it lives in an `HttpOnly` cookie that this code
 * cannot read. The caller closes the session on the server, which is what actually revokes it and
 * clears the cookie.
 */
export function endAuthSession(queryClient: QueryClient, reason: SessionEndReason): void {
  clearPersistedQueryCache();
  window.localStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
  queryClient.clear();
  useWorkingContextStore.getState().clearWorkingContext();
  useUnitPreferenceStore.getState().setSelectedUnitId("all");
  useSessionStore.getState().endSession(reason);
}
