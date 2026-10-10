import {
  Badge,
  Button,
  Field,
  HStack,
  Input,
  NativeSelect,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { Link as RouterLink, useLocation } from "react-router";

import {
  AsyncStateView,
  FeedbackState,
  ModuleShell,
  PaginationControls,
  StatusPanel,
  Surface,
} from "@/components";
import { formatActivityDate } from "@/utils/dateFormatting";
import type { ActivityStatus, ActivityType } from "@/types/domain";

import { useActivityCapabilities } from "../hooks/useActivityCapabilities";
import { useActivityMutations } from "../hooks/useActivityMutations";
import { useActivityProgram } from "../hooks/useActivityProgram";
import { useProgramActivitiesPage } from "../hooks/useProgramActivitiesPage";
import type { ActivityAccessMode } from "../model/activityAccess";
import {
  ACTIVITY_TYPE_ORDER,
  type ActivityListFilters,
  type ActivityStatusFilter,
} from "../model/administrativeActivity";
import { activityStatusLabels, activityTypeLabels } from "../model/catalogLabels";
import { activityDetailPath, programsHomePath } from "../model/activityRoutes";
import { readActivityDeletionNotice } from "../model/activityLifecycle";
import { ActivityForm } from "./ActivityForm";

export type ProgramActivitiesViewProps = {
  mode: ActivityAccessMode;
  programId: string;
};

type FiltersState = {
  dateFrom: string;
  dateTo: string;
  status: ActivityStatusFilter;
  type: string;
};

const EMPTY_FILTERS: FiltersState = {
  dateFrom: "",
  dateTo: "",
  status: "ALL",
  type: "",
};

const STATUS_ORDER: readonly ActivityStatus[] = [
  "DRAFT",
  "SCHEDULED",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
];

const statusColorPalette = {
  CANCELLED: "red",
  COMPLETED: "blue",
  DRAFT: "yellow",
  ONGOING: "green",
  SCHEDULED: "teal",
} as const;

function filtersOf(state: FiltersState, query: string): ActivityListFilters {
  return {
    ...(query ? { q: query } : {}),
    ...(state.dateFrom ? { dateFrom: state.dateFrom } : {}),
    ...(state.dateTo ? { dateTo: state.dateTo } : {}),
    status: state.status,
    ...(state.type ? { type: state.type as ActivityType } : {}),
  };
}

/**
 * Administracion de las actividades de un programa.
 *
 * Vive en una ruta propia por programa para que ADMIN y colaboradores compartan el mismo flujo: el
 * listado pagina y filtra del servidor, el alta nace como borrador dentro del programa y el detalle
 * se abre en su ruta. Las capacidades deciden que acciones se ofrecen; el backend conserva la
 * autoridad final.
 */
export function ProgramActivitiesView({ mode, programId }: ProgramActivitiesViewProps) {
  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const deletionNotice = readActivityDeletionNotice(useLocation().state);
  const capabilities = useActivityCapabilities({ mode, programId });
  const program = useActivityProgram(programId, mode);
  const activitiesQuery = useProgramActivitiesPage(
    programId,
    filtersOf(filters, query),
    page,
    capabilities.canRead,
  );
  const mutations = useActivityMutations();
  const items = activitiesQuery.page?.items ?? [];

  useEffect(() => {
    if (!feedback) return;

    createButtonRef.current?.focus();
  }, [feedback]);

  useEffect(() => {
    if (!deletionNotice) return;

    headingRef.current?.focus();
  }, [deletionNotice]);

  function updateFilters(patch: Partial<FiltersState>) {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  }

  function applySearch() {
    setQuery(search.trim());
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setQuery("");
    setFilters(EMPTY_FILTERS);
    setPage(1);
  }

  function openCreateForm() {
    setFeedback(null);
    mutations.reset();
    setIsCreating(true);
  }

  function closeCreateForm() {
    setIsCreating(false);
    mutations.reset();
    createButtonRef.current?.focus();
  }

  async function submitCreate(
    request: Parameters<ReturnType<typeof useActivityMutations>["create"]>[0],
  ) {
    try {
      const created = await mutations.create(request);
      setFeedback(
        `La actividad «${created.name}» se creó como borrador. Publíquela cuando esté lista para la agenda pública.`,
      );
      setIsCreating(false);
      mutations.reset();
      createButtonRef.current?.focus();
    } catch {
      // El formulario conserva lo escrito y muestra el fallo tipado.
    }
  }

  const accessState = capabilities.isResolving ? (
    <FeedbackState
      title="Verificando acceso"
      description="Confirmando sus permisos sobre el programa."
    />
  ) : !capabilities.canRead ? (
    <FeedbackState
      description="No tiene permisos vigentes para consultar las actividades de este programa. Solicite acceso a la administración."
      title="Contexto no autorizado"
    />
  ) : null;

  return (
    <ModuleShell
      actions={
        capabilities.canRead && !program.isArchived && capabilities.canCreate ? (
          <Button
            colorPalette="terracotta"
            disabled={mutations.isPending}
            onClick={openCreateForm}
            ref={createButtonRef}
            rounded="full"
          >
            Nueva actividad
          </Button>
        ) : undefined
      }
      description={
        program.name
          ? `Actividades del programa «${program.name}», incluidas sus programaciones y borradores.`
          : "Actividades del programa."
      }
      headingLabel={mode === "administration" ? "Administración" : "Operaciones"}
      headingRef={headingRef}
      title="Actividades"
    >
      <Stack gap={6}>
        <RouterLink to={programsHomePath(mode)}>
          {mode === "administration" ? "Volver a programas" : "Volver a mis operaciones"}
        </RouterLink>

        {deletionNotice ? <StatusPanel>{deletionNotice}</StatusPanel> : null}

        {program.isArchived ? (
          <StatusPanel>
            El programa está archivado: sus actividades se consultan, pero no admiten cambios ni
            altas.
          </StatusPanel>
        ) : null}

        {feedback ? <StatusPanel>{feedback}</StatusPanel> : null}

        {accessState ?? (
          <>
            <Surface padding="normal">
              <Stack gap={4}>
                <Stack
                  as="form"
                  gap={4}
                  onSubmit={(event) => {
                    event.preventDefault();
                    applySearch();
                  }}
                >
                  <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} gap={4}>
                    <Field.Root>
                      <Field.Label>Buscar actividades</Field.Label>
                      <Input
                        maxLength={200}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Nombre o descripción"
                        value={search}
                      />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Estado</Field.Label>
                      <NativeSelect.Root>
                        <NativeSelect.Field
                          onChange={(event) =>
                            updateFilters({
                              status: event.target.value as ActivityStatusFilter,
                            })
                          }
                          value={filters.status}
                        >
                          <option value="ALL">Todos</option>
                          {STATUS_ORDER.map((status) => (
                            <option key={status} value={status}>
                              {activityStatusLabels[status]}
                            </option>
                          ))}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Tipo</Field.Label>
                      <NativeSelect.Root>
                        <NativeSelect.Field
                          onChange={(event) => updateFilters({ type: event.target.value })}
                          value={filters.type}
                        >
                          <option value="">Todos</option>
                          {ACTIVITY_TYPE_ORDER.map((type) => (
                            <option key={type} value={type}>
                              {activityTypeLabels[type]}
                            </option>
                          ))}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                    </Field.Root>
                    <HStack align="end" gap={3}>
                      <Field.Root>
                        <Field.Label>Desde</Field.Label>
                        <Input
                          onChange={(event) => updateFilters({ dateFrom: event.target.value })}
                          type="date"
                          value={filters.dateFrom}
                        />
                      </Field.Root>
                      <Field.Root>
                        <Field.Label>Hasta</Field.Label>
                        <Input
                          onChange={(event) => updateFilters({ dateTo: event.target.value })}
                          type="date"
                          value={filters.dateTo}
                        />
                      </Field.Root>
                    </HStack>
                  </SimpleGrid>
                  <HStack gap={3} justify="end" wrap="wrap">
                    <Button onClick={clearFilters} rounded="full" type="button" variant="outline">
                      Limpiar filtros
                    </Button>
                    <Button rounded="full" type="submit" variant="outline">
                      Buscar
                    </Button>
                  </HStack>
                </Stack>
              </Stack>
            </Surface>

            {isCreating ? (
              <ActivityForm
                failure={mutations.failure}
                isSubmitting={mutations.isPending}
                mode="create"
                onCancel={closeCreateForm}
                onSubmit={submitCreate}
                programId={programId}
                programName={program.name ?? "Programa"}
              />
            ) : null}

            <AsyncStateView
              error={activitiesQuery.error}
              isLoading={activitiesQuery.isLoading}
              onRetry={() => void activitiesQuery.refetch()}
            >
              {items.length === 0 ? (
                <FeedbackState
                  description="Ajuste la búsqueda o los filtros para consultar otras actividades."
                  title="No hay actividades con esos filtros"
                />
              ) : (
                <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
                  {items.map((activity) => (
                    <Surface key={activity.id} padding="normal">
                      <Stack aria-label={activity.name} as="article" gap={3}>
                        <HStack gap={2} wrap="wrap">
                          <Badge colorPalette={statusColorPalette[activity.status]} rounded="full">
                            {activityStatusLabels[activity.status]}
                          </Badge>
                          <Badge rounded="full" variant="subtle">
                            {activityTypeLabels[activity.type]}
                          </Badge>
                        </HStack>
                        <Text fontFamily="heading" fontSize="xl" fontWeight="700">
                          {activity.name}
                        </Text>
                        <Text color="text.default" fontWeight="700">
                          {formatActivityDate(activity.date)} · {activity.startTime} -{" "}
                          {activity.endTime}
                          {activity.classroom ? ` · ${activity.classroom.name}` : ""}
                        </Text>
                        {activity.speakers.length > 0 ? (
                          <Text color="text.muted" fontSize="sm">
                            {activity.speakers
                              .map((speaker) => `${speaker.firstName} ${speaker.lastName}`)
                              .join(", ")}
                          </Text>
                        ) : null}
                        <Text color="text.muted" fontSize="sm">
                          {activity.capacity === null
                            ? "Capacidad no informada"
                            : `Capacidad: ${activity.capacity}`}
                        </Text>
                        <Button asChild alignSelf="start" size="sm" variant="outline">
                          <RouterLink to={activityDetailPath(mode, activity.id)}>
                            Ver detalle
                          </RouterLink>
                        </Button>
                      </Stack>
                    </Surface>
                  ))}
                </SimpleGrid>
              )}
              <PaginationControls
                currentPage={activitiesQuery.page?.page ?? page}
                itemLabel="actividades"
                onPageChange={setPage}
                pageCount={activitiesQuery.page?.totalPages ?? 1}
                pageSize={activitiesQuery.page?.limit ?? 20}
                totalItems={activitiesQuery.page?.total ?? 0}
              />
            </AsyncStateView>
          </>
        )}
      </Stack>
    </ModuleShell>
  );
}
