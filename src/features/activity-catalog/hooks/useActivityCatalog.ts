import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAppAdapters, type ActivityCatalogAccess } from "@/app/adapters";
import { queryKeys } from "@/app/query";
import { useClassrooms } from "@/features/classrooms";
import { useOrganizationalUnits } from "@/features/organizational-units";
import { useSessionStore } from "@/store/session";
import type { ActivityCatalog } from "@/types/domain";

import { assertCatalogIntegrity } from "../model/catalogIntegrity";

type CatalogComposition = {
  catalog: ActivityCatalog | null;
  integrityError: Error | null;
};

/**
 * Composes the public read model that selectors and views consume from three independent queries:
 * programs with activities, organizational units and classrooms. Referential integrity is asserted
 * here, because no single adapter owns the cross-resource references, and a violation becomes an
 * observable error instead of a throw during render.
 */
function composeCatalog(
  base: Pick<ActivityCatalog, "activities" | "eventPrograms"> | undefined,
  organizationalUnits: ActivityCatalog["organizationalUnits"] | null,
  classrooms: ActivityCatalog["classrooms"] | null,
): CatalogComposition {
  if (!base || !organizationalUnits || !classrooms) {
    return { catalog: null, integrityError: null };
  }

  const catalog: ActivityCatalog = {
    activities: base.activities,
    classrooms,
    eventPrograms: base.eventPrograms,
    organizationalUnits,
  };

  try {
    assertCatalogIntegrity(catalog);
  } catch (error) {
    return {
      catalog: null,
      integrityError: error instanceof Error ? error : new Error(String(error)),
    };
  }

  return { catalog, integrityError: null };
}

export function useActivityCatalog(access: ActivityCatalogAccess) {
  const { activityCatalog } = useAppAdapters();
  const userId = useSessionStore((state) => state.currentUser?.id);
  const canLoad = access === "public" || userId !== undefined;
  const classrooms = useClassrooms(access);
  const organizationalUnits = useOrganizationalUnits(access);
  const query = useQuery({
    enabled: canLoad,
    queryFn: () => activityCatalog.loadCatalog(access),
    queryKey:
      access === "public"
        ? queryKeys.publicActivityCatalog
        : queryKeys.administrativeActivityCatalog(userId ?? "anonymous"),
  });

  const composition = useMemo(
    () =>
      composeCatalog(query.data, organizationalUnits.organizationalUnits, classrooms.classrooms),
    [query.data, organizationalUnits.organizationalUnits, classrooms.classrooms],
  );

  const refetch = () => {
    if (!canLoad) {
      return Promise.resolve([]);
    }

    return Promise.all([query.refetch(), organizationalUnits.refetch(), classrooms.refetch()]).then(
      () => undefined,
    );
  };

  return {
    catalog: composition.catalog,
    error:
      query.error ?? classrooms.error ?? organizationalUnits.error ?? composition.integrityError,
    isLoading: query.isLoading || classrooms.isLoading || organizationalUnits.isLoading,
    refetch,
  };
}
