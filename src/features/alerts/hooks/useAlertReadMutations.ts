import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";

import { useAppAdapters } from "@/app/adapters";
import { queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";

import type { Alert, AlertFilters, AlertsPage, MarkAllAlertsReadResult } from "../model/alert";
import { applyAlertRead, type AlertReadIntent } from "../model/alertReadUpdates";

const ANONYMOUS_USER = "anonymous";

type AlertsSnapshot = [readonly unknown[], AlertsPage | undefined][];

/**
 * Variables de la mutacion.
 *
 * La identidad y la generacion viajan fijadas al momento de la llamada: los callbacks tardios
 * comparan contra ellas y no contra el render actual, de modo que un cambio de sesion en vuelo nunca
 * escribe en la cache de la cuenta que ya no es la actual, ni siquiera si vuelve a entrar la misma
 * cuenta.
 */
type AlertReadVariables = {
  intent: AlertReadIntent;
  userId: string;
  sessionGeneration: number;
};

function readFilters(queryKey: readonly unknown[]): AlertFilters {
  const candidate = queryKey[2];

  if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) return {};

  return candidate;
}

/**
 * Una accion solo escribe si la identidad y la generacion capturadas al iniciarla siguen siendo las
 * de la sesion viva. La generacion distingue dos accesos de la misma cuenta, caso que el `userId`
 * por si solo no puede detectar.
 */
function isCurrentIdentity(userId: string, sessionGeneration: number): boolean {
  const state = useSessionStore.getState();

  return (
    (state.currentUser?.id ?? ANONYMOUS_USER) === userId &&
    state.sessionGeneration === sessionGeneration
  );
}

/**
 * Marca alertas propias como leidas con actualizacion optimista.
 *
 * `cancelQueries` evita que un refetch en vuelo pise la escritura optimista; el snapshot completo
 * del scope permite restaurar items y contadores exactos si el backend rechaza. Una unica accion
 * pendiente por generacion impide que dos rollbacks se pisen entre si, sin bloquear a una sesion
 * nueva detras de una accion descartada. Los callbacks tardios comparan la identidad y la generacion
 * fijadas al inicio antes de escribir o invalidar: tras un cambio de sesion, la cache de la cuenta
 * anterior no se toca ni se revalida con el token nuevo.
 */
export function useAlertReadMutations() {
  const { alerts } = useAppAdapters();
  const queryClient = useQueryClient();
  const inFlightRef = useRef<{ sessionGeneration: number } | null>(null);

  const mutation = useMutation<
    Alert | MarkAllAlertsReadResult,
    Error,
    AlertReadVariables,
    { snapshots: AlertsSnapshot }
  >({
    mutationFn: ({ intent }: AlertReadVariables) =>
      intent.kind === "one" ? alerts.markAlertRead(intent.alertId) : alerts.markAllAlertsRead(),
    onError: (_error, { sessionGeneration, userId }, context) => {
      if (!isCurrentIdentity(userId, sessionGeneration)) return;

      for (const [key, page] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, page);
      }
    },
    onMutate: async ({ intent, sessionGeneration, userId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.alertsScope(userId) });

      if (!isCurrentIdentity(userId, sessionGeneration)) return { snapshots: [] };

      const snapshots = queryClient.getQueriesData<AlertsPage>({
        queryKey: queryKeys.alertsScope(userId),
      });

      for (const [key, page] of snapshots) {
        if (!page) continue;

        const next = applyAlertRead(page, readFilters(key), intent);
        if (next !== page) queryClient.setQueryData(key, next);
      }

      return { snapshots };
    },
    onSettled: (_data, _error, { sessionGeneration, userId }) => {
      if (!isCurrentIdentity(userId, sessionGeneration)) return;

      void queryClient.invalidateQueries({ queryKey: queryKeys.alertsScope(userId) });
    },
  });

  const run = async (intent: AlertReadIntent): Promise<unknown> => {
    const { currentUser, sessionGeneration } = useSessionStore.getState();
    const userId = currentUser?.id ?? ANONYMOUS_USER;

    if (inFlightRef.current?.sessionGeneration === sessionGeneration) return undefined;

    const inFlight = { sessionGeneration };
    inFlightRef.current = inFlight;
    try {
      return await mutation.mutateAsync({ intent, sessionGeneration, userId });
    } catch {
      // El fallo se expone por `error`; la vista muestra el copy localizado.
      return undefined;
    } finally {
      // Solo libera el bloqueo si sigue siendo la accion de esta llamada: una sesion nueva pudo
      // haber registrado la suya mientras esta estaba en vuelo.
      if (inFlightRef.current === inFlight) {
        inFlightRef.current = null;
      }
    }
  };

  return {
    error: mutation.error,
    isPending: mutation.isPending,
    markAllRead: async (): Promise<MarkAllAlertsReadResult | undefined> => {
      const result = await run({ kind: "all" });

      return result as MarkAllAlertsReadResult | undefined;
    },
    markRead: async (alert: Alert): Promise<boolean> =>
      (await run({ alertId: alert.id, kind: "one", wasUnread: !alert.isRead })) !== undefined,
    reset: mutation.reset,
  };
}

export type AlertReadMutations = ReturnType<typeof useAlertReadMutations>;
