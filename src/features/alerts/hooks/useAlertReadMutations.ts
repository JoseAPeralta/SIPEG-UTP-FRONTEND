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
 * La identidad viaja fijada al momento de la llamada: los callbacks tardios comparan contra ella y
 * no contra el render actual, de modo que un cambio de sesion en vuelo nunca escribe en la cache
 * de la cuenta que ya no es la actual.
 */
type AlertReadVariables = {
  intent: AlertReadIntent;
  userId: string;
};

function readFilters(queryKey: readonly unknown[]): AlertFilters {
  const candidate = queryKey[2];

  if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) return {};

  return candidate;
}

function currentUserId(): string {
  return useSessionStore.getState().currentUser?.id ?? ANONYMOUS_USER;
}

/**
 * Marca alertas propias como leidas con actualizacion optimista.
 *
 * `cancelQueries` evita que un refetch en vuelo pise la escritura optimista; el snapshot completo
 * del scope permite restaurar items y contadores exactos si el backend rechaza. Una unica accion
 * pendiente por instancia impide que dos rollbacks se pisen entre si. Los callbacks tardios
 * comparan la identidad fijada al inicio antes de escribir o invalidar: tras un cambio de sesion,
 * la cache de la cuenta anterior no se toca ni se revalida con el token nuevo.
 */
export function useAlertReadMutations() {
  const { alerts } = useAppAdapters();
  const queryClient = useQueryClient();
  const inFlightRef = useRef(false);

  const mutation = useMutation<
    Alert | MarkAllAlertsReadResult,
    Error,
    AlertReadVariables,
    { snapshots: AlertsSnapshot }
  >({
    mutationFn: ({ intent }: AlertReadVariables) =>
      intent.kind === "one" ? alerts.markAlertRead(intent.alertId) : alerts.markAllAlertsRead(),
    onError: (_error, { userId }, context) => {
      if (currentUserId() !== userId) return;

      for (const [key, page] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, page);
      }
    },
    onMutate: async ({ intent, userId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.alertsScope(userId) });

      if (currentUserId() !== userId) return { snapshots: [] };

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
    onSettled: (_data, _error, { userId }) => {
      if (currentUserId() !== userId) return;

      void queryClient.invalidateQueries({ queryKey: queryKeys.alertsScope(userId) });
    },
  });

  const run = async (intent: AlertReadIntent): Promise<unknown> => {
    if (inFlightRef.current) return undefined;

    inFlightRef.current = true;
    try {
      return await mutation.mutateAsync({ intent, userId: currentUserId() });
    } catch {
      // El fallo se expone por `error`; la vista muestra el copy localizado.
      return undefined;
    } finally {
      inFlightRef.current = false;
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
