import { useQuery } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters/context";
import { queryKeys } from "@/app/query/keys";
import { useUserScopes, type UserScopeStatus } from "@/features/collaboration";
import { useSessionStore } from "@/store/session";
import type { EventProgramStatus } from "@/types/domain";

import type { ActivityAccessMode } from "../model/activityAccess";

const EVENT_PROGRAM_STATUSES: readonly EventProgramStatus[] = [
  "DRAFT",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
];

function toEventProgramStatus(status: UserScopeStatus): EventProgramStatus | null {
  return EVENT_PROGRAM_STATUSES.includes(status as EventProgramStatus)
    ? (status as EventProgramStatus)
    : null;
}

export type ActivityProgramContext = {
  error: unknown;
  isArchived: boolean;
  isLoading: boolean;
  /** `null` mientras carga o si el programa no es accesible desde la sesion. */
  name: string | null;
  refetch: () => void;
  status: EventProgramStatus | null;
};

/**
 * Resuelve el programa propietario de las actividades que se administran.
 *
 * En `administration` lee el listado administrativo completo (`status=ALL`), porque el detalle de
 * programas solo devuelve activos y un borrador o un archivado tambien administra sus actividades.
 * En `operational` resuelve el nombre y el estado desde el scope descubierto, sin descargar el
 * catalogo administrativo completo. Un colaborador con acceso directo a la actividad resuelve el
 * programa de su scope exacto cuando no posee un scope de programa.
 */
export function useActivityProgram(
  programId: string,
  mode: ActivityAccessMode,
  activityId?: string,
): ActivityProgramContext {
  const { eventPrograms } = useAppAdapters();
  const currentUser = useSessionStore((state) => state.currentUser);
  const userId = currentUser?.id;
  const isAdministrator = mode === "administration" && currentUser?.globalRole === "ADMIN";
  const programsQuery = useQuery({
    enabled: isAdministrator && Boolean(userId && programId),
    queryFn: () => eventPrograms.loadEventPrograms("administrative", "ALL"),
    queryKey: queryKeys.administrativeEventProgramsAll(userId ?? "anonymous"),
  });
  const scopesQuery = useUserScopes({}, mode === "operational" && Boolean(userId));

  if (mode === "operational") {
    const scopes = scopesQuery.scopes ?? [];
    const programScope = scopes.find(
      (candidate) => candidate.type === "program" && candidate.id === programId,
    );
    const activityScope = activityId
      ? scopes.find((candidate) => candidate.type === "activity" && candidate.id === activityId)
      : undefined;
    const directProgram = activityScope?.eventProgram ?? null;
    const status = programScope
      ? toEventProgramStatus(programScope.status)
      : (directProgram?.status ?? null);

    return {
      error: scopesQuery.error,
      isArchived: status === "ARCHIVED",
      isLoading: scopesQuery.isLoading,
      name: programScope?.name ?? directProgram?.name ?? null,
      refetch: () => void scopesQuery.refetch(),
      status,
    };
  }

  const program = (programsQuery.data ?? []).find((candidate) => candidate.id === programId);

  return {
    error: programsQuery.error,
    isArchived: program?.status === "ARCHIVED",
    isLoading: programsQuery.isLoading,
    name: program?.name ?? null,
    refetch: () => void programsQuery.refetch(),
    status: program?.status ?? null,
  };
}
