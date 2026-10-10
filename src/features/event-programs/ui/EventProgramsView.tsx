import {
  Badge,
  Box,
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
import { Link as RouterLink } from "react-router";

import {
  AsyncStateView,
  FeedbackState,
  ModuleShell,
  PaginationControls,
  StatusPanel,
  Surface,
} from "@/components";
import { CollaboratorsView } from "@/features/collaboration";
import { useOrganizationalUnits } from "@/features/organizational-units";
import { useSessionStore } from "@/store/session";
import { useWorkingContextStore } from "@/store/workingContext";
import type { EventProgramStatus } from "@/types/domain";
import { formatProgramDateRange } from "@/utils/dateFormatting";

import {
  toEventProgramMutationFailure,
  type EventProgramMutationFailure,
} from "../adapters/eventProgramFailure";
import { useCreateEventProgram } from "../hooks/useCreateEventProgram";
import { useEventProgramMutations } from "../hooks/useEventProgramMutations";
import { useEventProgramsPage } from "../hooks/useEventProgramsPage";
import {
  eventProgramLifecycleActions,
  type EventProgramLifecycleAction,
} from "../model/eventProgramLifecycle";
import { eventProgramStatusLabels } from "../model/eventProgramLabels";
import type { EventProgramListItem, EventProgramStatusFilter } from "../model/eventProgramList";
import type {
  CreateEventProgramRequest,
  UpdateEventProgramRequest,
} from "../model/eventProgramRequests";
import { CreateEventProgramForm } from "./CreateEventProgramForm";
import { EditEventProgramForm } from "./EditEventProgramForm";

type FiltersState = {
  organizationalUnitId: string;
  status: EventProgramStatusFilter;
};

const EMPTY_FILTERS: FiltersState = { organizationalUnitId: "", status: "ALL" };

const statusOrder: readonly EventProgramStatus[] = [
  "DRAFT",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
];

const statusColorPalette = {
  ACTIVE: "green",
  ARCHIVED: "gray",
  CANCELLED: "red",
  COMPLETED: "blue",
  DRAFT: "yellow",
} as const;

type ProgramPendingAction = {
  kind: EventProgramLifecycleAction;
  program: EventProgramListItem;
};

type ConfirmationKind = Exclude<EventProgramLifecycleAction, "edit">;

const actionLabels: Record<EventProgramLifecycleAction, string> = {
  archive: "Archivar",
  edit: "Editar",
  publish: "Publicar",
  reactivate: "Reactivar",
};

const confirmationCopy: Record<
  ConfirmationKind,
  { confirm: string; description: (name: string) => string; label: string; title: string }
> = {
  archive: {
    confirm: "Confirmar archivo",
    description: (name) =>
      `El programa «${name}» dejará de estar visible y no podrá editarse. Podrá reactivarlo más adelante.`,
    label: "archivo",
    title: "Archivar programa",
  },
  publish: {
    confirm: "Confirmar publicación",
    description: (name) =>
      `El programa «${name}» pasará de borrador a activo. La transición no se deshace directamente: después solo podrá archivarse.`,
    label: "publicación",
    title: "Publicar programa",
  },
  reactivate: {
    confirm: "Confirmar reactivación",
    description: (name) => `El programa «${name}» volverá a estar activo con sus fechas actuales.`,
    label: "reactivación",
    title: "Reactivar programa",
  },
};

function lifecycleSuccessMessage(kind: EventProgramLifecycleAction, name: string): string {
  if (kind === "edit") return `Los cambios de «${name}» se guardaron.`;
  if (kind === "publish")
    return `El programa «${name}» quedó activo. Si no aparece en el listado, ajuste los filtros.`;
  if (kind === "archive") return `El programa «${name}» se archivó. Reactívelo cuando lo necesite.`;

  return `El programa «${name}» se reactivó.`;
}

function confirmationFailureMessage(
  kind: ConfirmationKind,
  failure: EventProgramMutationFailure | null,
): string | null {
  if (!failure) return null;
  if (failure === "forbidden") return "No tiene permisos para administrar programas.";
  if (failure === "notFound") return "El programa ya no existe; actualice el listado.";

  if (kind === "publish") {
    if (failure === "invalidRequest" || failure === "conflict")
      return "Solo un programa en borrador puede publicarse.";
    return "No fue posible publicar el programa. Intente de nuevo.";
  }
  if (kind === "archive") {
    if (failure === "conflict")
      return "No fue posible archivar: el programa tiene actividades programadas o en curso. Reprograme o cancele esas actividades antes de archivar.";
    return "No fue posible archivar el programa. Intente de nuevo.";
  }
  if (failure === "invalidRequest")
    return "El programa archivado no tiene un rango de fechas válido; no es posible reactivarlo.";
  if (failure === "conflict")
    return "Solo un programa adicional archivado puede reactivarse. La agenda permanente se reactiva desde su unidad.";

  return "No fue posible reactivar el programa. Intente de nuevo.";
}

/**
 * Listado administrativo de programas: busqueda, unidad, estado y paginacion del servidor. La
 * edicion y el ciclo de vida viven en un panel sobre el listado porque el detalle del contrato solo
 * devuelve programas activos: los borradores y los archivados se gestionan con el registro ya
 * validado de esta pantalla.
 */
export function EventProgramsView() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [createdProgramName, setCreatedProgramName] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<ProgramPendingAction | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const [collaboratorsSnapshot, setCollaboratorsSnapshot] = useState<EventProgramListItem | null>(
    null,
  );
  const [collaboratorsFocusRequest, setCollaboratorsFocusRequest] = useState(0);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const actionButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const listRef = useRef<HTMLDivElement | null>(null);
  const emptyRef = useRef<HTMLDivElement | null>(null);
  const collaboratorsHeadingRef = useRef<HTMLParagraphElement | null>(null);
  const isAdministrator = useSessionStore((state) => state.currentUser?.globalRole === "ADMIN");
  const workingContext = useWorkingContextStore((state) => state.workingContext);
  const setWorkingContext = useWorkingContextStore((state) => state.setWorkingContext);
  const creation = useCreateEventProgram();
  const lifecycle = useEventProgramMutations();

  const programsQuery = useEventProgramsPage(
    {
      ...(query ? { q: query } : {}),
      ...(filters.organizationalUnitId
        ? { organizationalUnitId: filters.organizationalUnitId }
        : {}),
      status: filters.status,
    },
    page,
  );
  const unitsQuery = useOrganizationalUnits("administrative");

  const items = programsQuery.page?.items ?? [];
  // La instantanea conserva el panel si el registro sale del listado por filtros o pagina; el
  // listado vigente reemplaza nombre y estado cuando vuelve a aparecer.
  const collaboratorsTarget = collaboratorsSnapshot
    ? (items.find((program) => program.id === collaboratorsSnapshot.id) ?? collaboratorsSnapshot)
    : null;
  const units = [...(unitsQuery.organizationalUnits ?? [])].sort((left, right) =>
    left.name.localeCompare(right.name, "es"),
  );
  const activeUnits = units.filter((unit) => unit.isActive);
  // Una mutacion en vuelo conserva su panel: cambiar de panel mientras la peticion sigue podria
  // descartar la resolucion pendiente sobre el panel nuevo.
  const isBusy = creation.isPending || lifecycle.isPending;

  useEffect(() => {
    if (focusRequest === 0) return;

    (listRef.current ?? emptyRef.current)?.focus();
  }, [focusRequest]);

  useEffect(() => {
    if (collaboratorsFocusRequest === 0) return;

    collaboratorsHeadingRef.current?.focus();
  }, [collaboratorsFocusRequest]);

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

  function actionRef(key: string) {
    return (node: HTMLButtonElement | null) => {
      if (node) actionButtonRefs.current.set(key, node);
      else actionButtonRefs.current.delete(key);
    };
  }

  function clearCollaboratorsTarget() {
    setCollaboratorsSnapshot(null);
  }

  function openCreateForm() {
    setCreatedProgramName(null);
    setFeedback(null);
    creation.reset();
    lifecycle.reset();
    setPendingAction(null);
    clearCollaboratorsTarget();
    setIsCreating(true);
  }

  function closeCreateForm() {
    setIsCreating(false);
    creation.reset();
    createButtonRef.current?.focus();
  }

  function openAction(action: ProgramPendingAction) {
    setCreatedProgramName(null);
    setFeedback(null);
    creation.reset();
    lifecycle.reset();
    clearCollaboratorsTarget();
    setIsCreating(false);
    setPendingAction(action);
  }

  function openCollaborators(program: EventProgramListItem) {
    setCreatedProgramName(null);
    setFeedback(null);
    creation.reset();
    lifecycle.reset();
    setIsCreating(false);
    setPendingAction(null);
    setCollaboratorsSnapshot(program);
    setCollaboratorsFocusRequest((value) => value + 1);
  }

  function closeCollaborators() {
    const target = collaboratorsTarget;
    clearCollaboratorsTarget();
    if (target) {
      (
        actionButtonRefs.current.get(`${target.id}:collaborators`) ??
        listRef.current ??
        emptyRef.current
      )?.focus();
    }
  }

  function isSelectedProgram(program: EventProgramListItem) {
    return workingContext?.kind === "eventProgram" && workingContext.id === program.id;
  }

  function closeAction() {
    const action = pendingAction;
    setPendingAction(null);
    lifecycle.reset();
    if (action) actionButtonRefs.current.get(`${action.program.id}:${action.kind}`)?.focus();
  }

  /** Anuncia el resultado y lleva el foco al listado, que es el unico destino que siempre existe. */
  function completeAction(kind: EventProgramLifecycleAction, name: string) {
    setFeedback(lifecycleSuccessMessage(kind, name));
    setPendingAction(null);
    lifecycle.reset();
    setFocusRequest((value) => value + 1);
  }

  async function submitCreate(request: CreateEventProgramRequest) {
    try {
      const created = await creation.create(request);
      setCreatedProgramName(created.name);
      setIsCreating(false);
      creation.reset();
      createButtonRef.current?.focus();
    } catch (error) {
      const failure = toEventProgramMutationFailure(error);
      if (failure === "invalidRequest" || failure === "notFound") {
        void unitsQuery.refetch();
      }
    }
  }

  async function submitEdit(program: EventProgramListItem, request: UpdateEventProgramRequest) {
    try {
      await lifecycle.update(program, request);
      completeAction("edit", program.name);
    } catch {
      // El panel conserva lo escrito y muestra el fallo tipado.
    }
  }

  async function confirmLifecycleAction() {
    const action = pendingAction;
    if (!action || action.kind === "edit") return;

    try {
      if (action.kind === "publish") await lifecycle.publish(action.program);
      else if (action.kind === "archive") await lifecycle.archive(action.program);
      else await lifecycle.reactivate(action.program);
      completeAction(action.kind, action.program.name);
    } catch {
      // La confirmacion sigue abierta y muestra el fallo tipado.
    }
  }

  return (
    <ModuleShell
      actions={
        isAdministrator ? (
          <Button
            colorPalette="terracotta"
            disabled={isBusy}
            onClick={openCreateForm}
            ref={createButtonRef}
            rounded="full"
          >
            Nuevo programa
          </Button>
        ) : undefined
      }
      description="Busque y filtre los programas de cada unidad, incluidos borradores, archivados y agendas permanentes."
      headingLabel="Administración"
      title="Programas"
    >
      <Stack gap={6}>
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
              <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
                <Field.Root>
                  <Field.Label>Buscar programas</Field.Label>
                  <Input
                    maxLength={200}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Nombre o etiqueta"
                    value={search}
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Unidad</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      onChange={(event) =>
                        updateFilters({ organizationalUnitId: event.target.value })
                      }
                      value={filters.organizationalUnitId}
                    >
                      <option value="">Todas</option>
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name}
                        </option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>
                <Field.Root>
                  <Field.Label>Estado</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      onChange={(event) =>
                        updateFilters({
                          status: event.target.value as EventProgramStatusFilter,
                        })
                      }
                      value={filters.status}
                    >
                      <option value="ALL">Todos</option>
                      {statusOrder.map((status) => (
                        <option key={status} value={status}>
                          {eventProgramStatusLabels[status]}
                        </option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>
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
            {unitsQuery.error ? (
              <HStack gap={3} wrap="wrap">
                <Text color="fg.error" role="alert">
                  No fue posible cargar las unidades para filtrar.
                </Text>
                <Button onClick={() => void unitsQuery.refetch()} size="sm" variant="outline">
                  Reintentar
                </Button>
              </HStack>
            ) : null}
          </Stack>
        </Surface>

        {createdProgramName ? (
          <StatusPanel>
            El programa «{createdProgramName}» se creó como borrador. Si no aparece en el listado,
            ajuste los filtros.
          </StatusPanel>
        ) : null}

        {feedback ? <StatusPanel>{feedback}</StatusPanel> : null}

        {isCreating ? (
          <CreateEventProgramForm
            failure={creation.failure}
            isSubmitting={creation.isPending}
            onCancel={closeCreateForm}
            onSubmit={submitCreate}
            units={activeUnits}
          />
        ) : null}

        {pendingAction ? (
          pendingAction.kind === "edit" ? (
            <EditEventProgramForm
              failure={lifecycle.failure}
              isRefreshing={programsQuery.isFetching}
              isSubmitting={lifecycle.isPending}
              key={pendingAction.program.id}
              onCancel={closeAction}
              onRefresh={() => void programsQuery.refetch()}
              onSubmit={(request) => submitEdit(pendingAction.program, request)}
              program={pendingAction.program}
            />
          ) : (
            <Surface padding="normal">
              <Stack
                aria-label={`Confirmar ${confirmationCopy[pendingAction.kind].label} de ${pendingAction.program.name}`}
                gap={3}
                role="group"
              >
                <Text fontFamily="heading" fontSize="lg" fontWeight="700">
                  {confirmationCopy[pendingAction.kind].title}
                </Text>
                <Text color="text.muted">
                  {confirmationCopy[pendingAction.kind].description(pendingAction.program.name)}
                </Text>
                {confirmationFailureMessage(pendingAction.kind, lifecycle.failure) ? (
                  <Text color="fg.error" role="alert">
                    {confirmationFailureMessage(pendingAction.kind, lifecycle.failure)}
                  </Text>
                ) : null}
                <HStack gap={3} justify="end" wrap="wrap">
                  {lifecycle.failure === "conflict" || lifecycle.failure === "notFound" ? (
                    <Button
                      disabled={lifecycle.isPending || programsQuery.isFetching}
                      onClick={() => void programsQuery.refetch()}
                      type="button"
                      variant="outline"
                    >
                      Actualizar listado
                    </Button>
                  ) : null}
                  <Button
                    autoFocus
                    disabled={lifecycle.isPending}
                    onClick={closeAction}
                    type="button"
                    variant="outline"
                  >
                    Cancelar
                  </Button>
                  <Button
                    colorPalette={
                      pendingAction.kind === "archive"
                        ? "red"
                        : pendingAction.kind === "reactivate"
                          ? "success"
                          : "terracotta"
                    }
                    disabled={lifecycle.isPending}
                    loading={lifecycle.isPending}
                    loadingText="Confirmando..."
                    onClick={() => void confirmLifecycleAction()}
                    type="button"
                  >
                    {confirmationCopy[pendingAction.kind].confirm}
                  </Button>
                </HStack>
              </Stack>
            </Surface>
          )
        ) : null}

        {collaboratorsTarget ? (
          <Surface padding="normal">
            <Stack gap={4}>
              <HStack justify="space-between" wrap="wrap">
                <Stack gap={1}>
                  <Text
                    as="h2"
                    fontFamily="heading"
                    fontSize="lg"
                    fontWeight="700"
                    ref={collaboratorsHeadingRef}
                    tabIndex={-1}
                  >
                    Colaboradores de {collaboratorsTarget.name}
                  </Text>
                  <Text color="text.muted" fontSize="sm">
                    Estado del programa: {eventProgramStatusLabels[collaboratorsTarget.status]}
                  </Text>
                </Stack>
                <Button onClick={closeCollaborators} type="button" variant="outline">
                  Cerrar colaboradores
                </Button>
              </HStack>
              <CollaboratorsView
                key={`program:${collaboratorsTarget.id}`}
                canManage={isAdministrator}
                onRefreshContext={async () => {
                  await programsQuery.refetch();
                }}
                readOnly={collaboratorsTarget.status === "ARCHIVED"}
                scope={{ type: "program", id: collaboratorsTarget.id }}
              />
            </Stack>
          </Surface>
        ) : null}

        <AsyncStateView
          error={programsQuery.error}
          isLoading={programsQuery.isLoading}
          onRetry={() => void programsQuery.refetch()}
        >
          {items.length === 0 ? (
            <Box aria-label="Resultado de programas" ref={emptyRef} role="group" tabIndex={-1}>
              <FeedbackState
                description="Ajuste la búsqueda o los filtros para consultar otros programas."
                title="No hay programas que coincidan con los filtros"
              />
            </Box>
          ) : (
            <Box aria-label="Listado de programas" ref={listRef} role="group" tabIndex={-1}>
              <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
                {items.map((program) => (
                  <Surface key={program.id} padding="normal">
                    <Stack aria-label={program.name} as="article" gap={3}>
                      <HStack justify="space-between" wrap="wrap">
                        <Badge colorPalette={statusColorPalette[program.status]} rounded="full">
                          {eventProgramStatusLabels[program.status]}
                        </Badge>
                        {program.isDefault ? (
                          <Badge colorPalette="terracotta" rounded="full">
                            Agenda permanente
                          </Badge>
                        ) : null}
                        {isSelectedProgram(program) ? (
                          <Badge colorPalette="teal" rounded="full">
                            Contexto seleccionado
                          </Badge>
                        ) : null}
                      </HStack>
                      <Stack gap={1}>
                        <Text fontFamily="heading" fontSize="xl" fontWeight="700">
                          {program.name}
                        </Text>
                        {program.label ? (
                          <Text color="text.muted" fontSize="sm" fontWeight="700">
                            {program.label}
                          </Text>
                        ) : null}
                        {program.description ? (
                          <Text color="text.muted">{program.description}</Text>
                        ) : null}
                      </Stack>
                      <Text color="text.default" fontWeight="700">
                        {program.organizationalUnit.name}
                      </Text>
                      {program.isDefault ? null : (
                        <Text color="text.muted">
                          {formatProgramDateRange(program) ?? "Sin fechas programadas"}
                        </Text>
                      )}
                      {program.isDefault ? (
                        <Text color="text.muted" fontSize="sm">
                          {program.status === "ARCHIVED"
                            ? "La agenda permanente está archivada porque su unidad está inactiva. Reactive la unidad para restaurarla."
                            : "Agenda permanente: su ciclo de vida lo controla la unidad."}
                        </Text>
                      ) : null}
                      {isAdministrator ? (
                        <HStack gap={2} wrap="wrap">
                          {eventProgramLifecycleActions(program).map((action) => (
                            <Button
                              disabled={isBusy}
                              key={action}
                              onClick={() => openAction({ kind: action, program })}
                              ref={actionRef(`${program.id}:${action}`)}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              {actionLabels[action]}
                            </Button>
                          ))}
                          <Button
                            disabled={isBusy}
                            onClick={() => openCollaborators(program)}
                            ref={actionRef(`${program.id}:collaborators`)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Colaboradores
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <RouterLink to={`/admin/programas/${program.id}/actividades`}>
                              Actividades
                            </RouterLink>
                          </Button>
                          <Button
                            disabled={isSelectedProgram(program)}
                            onClick={() =>
                              setWorkingContext({ id: program.id, kind: "eventProgram" })
                            }
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Usar como contexto
                          </Button>
                          {program.isDefault ? (
                            <Button asChild size="sm" variant="ghost">
                              <RouterLink to={`/admin/unidades/${program.organizationalUnit.id}`}>
                                Gestionar unidad
                              </RouterLink>
                            </Button>
                          ) : null}
                        </HStack>
                      ) : null}
                    </Stack>
                  </Surface>
                ))}
              </SimpleGrid>
            </Box>
          )}
          <PaginationControls
            currentPage={programsQuery.page?.page ?? page}
            itemLabel="programas"
            onPageChange={setPage}
            pageCount={programsQuery.page?.totalPages ?? 1}
            pageSize={programsQuery.page?.limit ?? 20}
            totalItems={programsQuery.page?.total ?? 0}
          />
        </AsyncStateView>
      </Stack>
    </ModuleShell>
  );
}
