import { useMemo } from "react";
import { useIsFetching, useQuery } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters";
import type { ActivityCatalogMode } from "@/app/adapters/contracts";
import { queryKeys } from "@/app/query";
import { useClassrooms } from "@/features/classrooms";
import { useOrganizationalUnits } from "@/features/organizational-units";
import { useSessionStore } from "@/store/session";
import type { ActivityCatalog } from "@/types/domain";

import { assertCatalogIntegrity } from "../model/catalogIntegrity";

export type UseActivityCatalogOptions = {
  mode?: ActivityCatalogMode;
};

type CatalogComposition = {
  catalog: ActivityCatalog | null;
  integrityError: Error | null;
};

/**
 * Composes the administrative read model that selectors and views consume from three independent
 * queries: programs with activities, organizational units and classrooms. Referential integrity is
 * asserted here, because no single adapter owns the cross-resource references, and a violation
 * becomes an observable error instead of a throw during render.
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

/**
 * Catalogo administrativo.
 *
 * La consulta solo se habilita con una identidad presente: sin sesion no hay lectura anonima del
 * catalogo compuesto, y la clave liga el resultado al usuario para no reutilizarlo entre cuentas.
 * La modalidad `all-programs` pertenece al contexto de trabajo administrativo: resuelve programas
 * en cualquier estado, unidades y aulas inactivas, y solo un ADMIN puede habilitarla.
 */
export function useActivityCatalog(options: UseActivityCatalogOptions = {}) {
  const mode = options.mode ?? "active-programs";
  const { activityCatalog } = useAppAdapters();
  const userId = useSessionStore((state) => state.currentUser?.id);
  const isAdministrator = useSessionStore((state) => state.currentUser?.globalRole === "ADMIN");
  const canLoad = userId !== undefined && (mode === "active-programs" || isAdministrator);
  const allPrograms = mode === "all-programs";
  const classrooms = useClassrooms("administrative", allPrograms ? { isActive: "all" } : undefined);
  const organizationalUnits = useOrganizationalUnits(
    "administrative",
    allPrograms ? { isActive: "all" } : undefined,
  );
  /**
   * `useClassrooms` no expone `isFetching`; la clave es la misma que registra el hook y el conteo
   * global alcanza cualquier consumidor de esa consulta compartida.
   */
  const fetchingClassrooms = useIsFetching({
    queryKey: queryKeys.administrativeClassrooms(
      userId ?? "anonymous",
      allPrograms ? { isActive: "all" } : undefined,
    ),
  });
  const query = useQuery({
    enabled: canLoad,
    queryFn: () =>
      allPrograms ? activityCatalog.loadCatalog("all-programs") : activityCatalog.loadCatalog(),
    queryKey: allPrograms
      ? queryKeys.administrativeWorkingContextCatalog(userId ?? "anonymous")
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
    isFetching: query.isFetching || fetchingClassrooms > 0 || organizationalUnits.isFetching,
    isLoading: query.isLoading || classrooms.isLoading || organizationalUnits.isLoading,
    refetch,
  };
}
