import { useCallback, useEffect, useMemo } from "react";

import { useActivityCatalog } from "@/features/activity-catalog";
import { useSessionStore } from "@/store/session";
import { useWorkingContextStore } from "@/store/workingContext";

import {
  buildWorkingContextOptions,
  parseWorkingContext,
  resolveWorkingScope,
  serializeWorkingContext,
} from "../model/workingContext";

const EMPTY_OPTIONS = { activities: [], programs: [] };

/**
 * Contexto de trabajo administrativo.
 *
 * La modalidad completa resuelve programas en cualquier estado y referencias historicas. Una
 * relectura completa y concluida sin error reconcilia la seleccion: si el contexto ya no existe,
 * se retira y se anuncia; durante una carga, un refresco o un fallo la seleccion se conserva y no
 * se presenta como vigente hasta poder confirmarla.
 */
export function useWorkingContext() {
  const isAdministrator = useSessionStore((state) => state.currentUser?.globalRole === "ADMIN");
  const { catalog, error, isFetching, isLoading, refetch } = useActivityCatalog({
    mode: isAdministrator ? "all-programs" : "active-programs",
  });
  const workingContext = useWorkingContextStore((state) => state.workingContext);
  const contextRevokedNotice = useWorkingContextStore((state) => state.contextRevokedNotice);
  const setWorkingContext = useWorkingContextStore((state) => state.setWorkingContext);
  const clearWorkingContext = useWorkingContextStore((state) => state.clearWorkingContext);
  const noteRevokedSelection = useWorkingContextStore((state) => state.noteRevokedSelection);

  const scope = useMemo(
    () => (catalog ? resolveWorkingScope(workingContext, catalog) : null),
    [catalog, workingContext],
  );
  const options = useMemo(
    () => (catalog ? buildWorkingContextOptions(catalog) : EMPTY_OPTIONS),
    [catalog],
  );
  const value = useMemo(() => serializeWorkingContext(workingContext), [workingContext]);

  useEffect(() => {
    if (!workingContext || !isAdministrator) return;
    if (!catalog || error || isLoading || isFetching) return;

    const exists =
      workingContext.kind === "eventProgram"
        ? catalog.eventPrograms.some((program) => program.id === workingContext.id)
        : catalog.activities.some((activity) => activity.id === workingContext.id);

    if (!exists) noteRevokedSelection();
  }, [
    catalog,
    error,
    isAdministrator,
    isFetching,
    isLoading,
    noteRevokedSelection,
    workingContext,
  ]);

  const onValueChange = useCallback(
    (nextValue: string) => {
      setWorkingContext(parseWorkingContext(nextValue));
    },
    [setWorkingContext],
  );

  return {
    catalog,
    clearWorkingContext,
    error,
    isFetching,
    isLoading,
    onValueChange,
    options,
    refetch,
    scope,
    selectionRevoked: contextRevokedNotice && workingContext === null,
    value,
    workingContext,
  };
}
