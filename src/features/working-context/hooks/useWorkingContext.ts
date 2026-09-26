import { useCallback, useMemo } from "react";

import { useActivityCatalog } from "@/features/activity-catalog";
import { useWorkingContextStore } from "@/store/workingContext";

import {
  buildWorkingContextOptions,
  parseWorkingContext,
  resolveWorkingScope,
  serializeWorkingContext,
} from "../model/workingContext";

const EMPTY_OPTIONS = { activities: [], programs: [] };

export function useWorkingContext() {
  const { catalog, error, isLoading, refetch } = useActivityCatalog("administrative");
  const workingContext = useWorkingContextStore((state) => state.workingContext);
  const setWorkingContext = useWorkingContextStore((state) => state.setWorkingContext);
  const clearWorkingContext = useWorkingContextStore((state) => state.clearWorkingContext);

  const scope = useMemo(
    () => (catalog ? resolveWorkingScope(workingContext, catalog) : null),
    [catalog, workingContext],
  );
  const options = useMemo(
    () => (catalog ? buildWorkingContextOptions(catalog) : EMPTY_OPTIONS),
    [catalog],
  );
  const value = useMemo(() => serializeWorkingContext(workingContext), [workingContext]);

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
    isLoading,
    onValueChange,
    options,
    refetch,
    scope,
    value,
    workingContext,
  };
}
