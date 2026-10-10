import { Badge, Box, Button, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router";

import { AsyncStateView, FeedbackState, ModuleShell, StatusPanel, Surface } from "@/components";
import { hasScopeCapability, useUserScopes } from "@/features/collaboration";
import { useSessionStore } from "@/store/session";
import { formatActivityDate } from "@/utils/dateFormatting";

import { isActivityEditable } from "../model/administrativeActivity";
import type { ActivityAccessMode } from "../model/activityAccess";
import type { CancelActivityRequest } from "../model/activityRequests";
import { useActivityCapabilities } from "../hooks/useActivityCapabilities";
import { useActivityMutations } from "../hooks/useActivityMutations";
import { useActivityProgram } from "../hooks/useActivityProgram";
import { useAdministrativeActivityDetail } from "../hooks/useAdministrativeActivityDetail";
import { useDeleteActivity } from "../hooks/useDeleteActivity";
import { activityStatusLabels, activityTypeLabels } from "../model/catalogLabels";
import { canOfferActivityDeletion } from "../model/activityDeletion";
import {
  ACTIVITY_DELETION_NOTICE_KEY,
  activityDeletionSuccessMessage,
  activityLifecycleSuccessMessage,
  getActivityLifecycleActions,
  type ActivityLifecycleAction,
} from "../model/activityLifecycle";
import { programActivitiesPath, programsHomePath } from "../model/activityRoutes";
import { ActivityForm } from "./ActivityForm";
import { ActivityLifecycleConfirmation } from "./ActivityLifecycleConfirmation";

export type ActivityDetailViewProps = {
  activityId: string;
  mode: ActivityAccessMode;
};

type ActivityDetailPanel =
  { kind: "edit" } | { kind: "lifecycle"; action: ActivityLifecycleAction } | null;

const statusColorPalette = {
  CANCELLED: "red",
  COMPLETED: "blue",
  DRAFT: "yellow",
  ONGOING: "green",
  SCHEDULED: "teal",
} as const;

const lifecycleActionLabels: Record<ActivityLifecycleAction, string> = {
  cancel: "Cancelar actividad",
  delete: "Eliminar borrador",
  publish: "Publicar actividad",
  unpublish: "Despublicar actividad",
};

/**
 * Detalle administrativo de una actividad con su edicion y su ciclo de vida en linea.
 *
 * Solo un panel (edicion o confirmacion) permanece abierto. Las acciones se filtran por la matriz
 * estado×permiso y, para cancelar, por el estado activo del programa padre. Un `409` conserva el
 * motivo escrito y ofrece releer la actividad sin repetir la mutacion; el aula asignada se conserva
 * aunque la consulta de disponibilidad ya no la devuelva, porque solo el backend puede validar su
 * propia reserva.
 */
export function ActivityDetailView({ activityId, mode }: ActivityDetailViewProps) {
  const [panel, setPanel] = useState<ActivityDetailPanel>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [headingFocusRequest, setHeadingFocusRequest] = useState(0);
  const pendingActionFocusRef = useRef<ActivityLifecycleAction | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const lifecycleButtonRefs = useRef(new Map<ActivityLifecycleAction, HTMLButtonElement>());
  const detail = useAdministrativeActivityDetail(activityId, true);
  const activity = detail.activity;
  const currentUser = useSessionStore((state) => state.currentUser);
  const isAdministrator = mode === "administration" && currentUser?.globalRole === "ADMIN";
  const scopesQuery = useUserScopes({}, !isAdministrator && currentUser !== null);
  const capabilities = useActivityCapabilities({
    activityId,
    mode,
    programId: activity?.eventProgram.id ?? "",
  });
  const program = useActivityProgram(activity?.eventProgram.id ?? "", mode, activityId);
  const mutations = useActivityMutations();
  const navigate = useNavigate();
  const isContextResolved =
    !detail.isLoading &&
    detail.error === null &&
    !program.isLoading &&
    program.error === null &&
    !capabilities.isResolving &&
    scopesQuery.error === null;
  const canDeleteActivity =
    isContextResolved &&
    activity !== null &&
    canOfferActivityDeletion({
      activityStatus: activity.status,
      hasDeletePermission: capabilities.canDelete,
      programStatus: program.status,
    });
  const deletion = useDeleteActivity({
    activityId,
    programId: activity?.eventProgram.id ?? "",
    onDeleted: () => {
      void navigate(resolveDeletionDestination(), {
        replace: true,
        state: {
          [ACTIVITY_DELETION_NOTICE_KEY]: activityDeletionSuccessMessage(activity?.name ?? ""),
        },
      });
    },
  });
  const isDeleting = deletion.isPending;

  /**
   * Destino accesible tras eliminar: la administracion vuelve a las actividades del programa, un
   * colaborador con lectura del programa hace lo propio en operaciones, y quien solo accedia a la
   * actividad regresa al descubrimiento operativo en lugar de a una pantalla no autorizada.
   */
  function resolveDeletionDestination(): string {
    const programId = activity?.eventProgram.id;
    if (isAdministrator && programId) {
      return programActivitiesPath("administration", programId);
    }
    if (
      programId &&
      hasScopeCapability(
        scopesQuery.scopes ?? [],
        { id: programId, type: "program" },
        "activity:read",
      )
    ) {
      return programActivitiesPath("operational", programId);
    }

    return "/operaciones";
  }

  useEffect(() => {
    if (headingFocusRequest === 0) return;

    headingRef.current?.focus();
  }, [headingFocusRequest]);

  useEffect(() => {
    const action = pendingActionFocusRef.current;
    if (panel !== null || action === null) return;

    pendingActionFocusRef.current = null;
    lifecycleButtonRefs.current.get(action)?.focus();
  }, [panel]);

  const baseActions = activity ? getActivityLifecycleActions(activity.status) : [];
  const accessConfirmed = capabilities.canRead;
  const canEditActivity =
    accessConfirmed &&
    capabilities.canEdit &&
    activity !== null &&
    isActivityEditable(activity.status);
  const projectAction = (action: ActivityLifecycleAction) => baseActions.includes(action);
  const lifecycleActions: ActivityLifecycleAction[] = [];
  if (canEditActivity && projectAction("publish")) lifecycleActions.push("publish");
  if (canEditActivity && projectAction("unpublish")) lifecycleActions.push("unpublish");
  if (capabilities.canCancel && program.status === "ACTIVE" && projectAction("cancel")) {
    lifecycleActions.push("cancel");
  }
  if (canDeleteActivity) lifecycleActions.push("delete");
  const isActionAllowed =
    panel === null || panel.kind === "edit" ? true : lifecycleActions.includes(panel.action);

  function openEditor() {
    if (mutations.isPending || isDeleting) return;

    setFeedback(null);
    mutations.reset();
    deletion.reset();
    setPanel({ kind: "edit" });
  }

  function closeEditor() {
    setPanel(null);
    mutations.reset();
  }

  function openLifecycle(action: ActivityLifecycleAction) {
    if (mutations.isPending || isDeleting) return;

    setFeedback(null);
    mutations.reset();
    deletion.reset();
    setPanel({ kind: "lifecycle", action });
    setHeadingFocusRequest((value) => value + 1);
  }

  function closeLifecycle() {
    if (isDeleting) return;

    const action = panel?.kind === "lifecycle" ? panel.action : null;
    if (action) pendingActionFocusRef.current = action;
    setPanel(null);
    mutations.reset();
    deletion.reset();
  }

  function refreshContext() {
    if (panel?.kind === "lifecycle" && panel.action === "delete") deletion.reset();
    void detail.refetch();
    program.refetch();
    void scopesQuery.refetch();
  }

  async function submitDelete() {
    if (panel?.kind !== "lifecycle" || panel.action !== "delete" || deletion.isPending) return;

    try {
      await deletion.remove();
    } catch {
      // La confirmacion conserva el texto y muestra el fallo tipado.
    }
  }

  async function submitEdit(
    request: Parameters<ReturnType<typeof useActivityMutations>["update"]>[1],
  ) {
    try {
      const updated = await mutations.update(activityId, request);
      setFeedback(`Los cambios de «${updated.name}» se guardaron.`);
      setPanel(null);
      mutations.reset();
    } catch {
      // El formulario conserva lo escrito y muestra el fallo tipado.
    }
  }

  async function submitLifecycle(request: CancelActivityRequest) {
    const action = panel?.kind === "lifecycle" ? panel.action : null;
    if (!action || mutations.isPending) return;

    try {
      const updated =
        action === "publish"
          ? await mutations.publish(activityId)
          : action === "unpublish"
            ? await mutations.unpublish(activityId)
            : await mutations.cancel(activityId, request);
      setFeedback(activityLifecycleSuccessMessage(action, updated.name));
      setPanel(null);
      mutations.reset();
      setHeadingFocusRequest((value) => value + 1);
    } catch {
      // La confirmacion conserva el motivo y muestra el fallo tipado.
    }
  }

  const accessState = capabilities.isResolving ? (
    <FeedbackState
      title="Verificando acceso"
      description="Confirmando sus permisos sobre la actividad."
    />
  ) : scopesQuery.error ? (
    <FeedbackState
      action={<Button onClick={() => void scopesQuery.refetch()}>Reintentar</Button>}
      description="No se pudo confirmar sus permisos sobre la actividad. Intente de nuevo."
      role="alert"
      title="No se pudo verificar el acceso"
    />
  ) : !capabilities.canRead ? (
    <FeedbackState
      description="No tiene permisos vigentes para consultar esta actividad. Solicite acceso a la administración."
      title="Contexto no autorizado"
    />
  ) : null;

  return (
    <ModuleShell
      actions={
        canEditActivity ? (
          <Button
            colorPalette="terracotta"
            disabled={panel !== null || mutations.isPending || isDeleting}
            onClick={openEditor}
            rounded="full"
          >
            Editar actividad
          </Button>
        ) : undefined
      }
      description={
        accessConfirmed
          ? "Datos completos de la actividad, su programa, su aula y sus ponentes."
          : "El detalle de la actividad se habilita al confirmar el acceso."
      }
      headingLabel={mode === "administration" ? "Administración" : "Operaciones"}
      headingRef={headingRef}
      title={accessConfirmed ? (activity?.name ?? "Actividad") : "Actividad"}
    >
      <Stack gap={6}>
        {accessConfirmed && activity ? (
          <RouterLink to={programActivitiesPath(mode, activity.eventProgram.id)}>
            Volver a las actividades del programa
          </RouterLink>
        ) : (
          <RouterLink to={programsHomePath(mode)}>Volver a programas</RouterLink>
        )}

        {feedback ? <StatusPanel>{feedback}</StatusPanel> : null}

        {accessState ?? (
          <AsyncStateView
            error={detail.error}
            isLoading={detail.isLoading}
            onRetry={() => void detail.refetch()}
          >
            {activity ? (
              <>
                {panel?.kind === "edit" ? (
                  <ActivityForm
                    failure={mutations.failure}
                    isRefreshing={detail.isFetching}
                    isSubmitting={mutations.isPending}
                    mode="edit"
                    onCancel={closeEditor}
                    onRefresh={() => void detail.refetch()}
                    onSubmit={submitEdit}
                    original={activity}
                    programName={activity.eventProgram.name}
                  />
                ) : null}

                {panel?.kind === "lifecycle" ? (
                  <ActivityLifecycleConfirmation
                    action={panel.action}
                    activityName={activity.name}
                    failure={panel.action === "delete" ? deletion.failure : mutations.failure}
                    isAllowed={isActionAllowed}
                    isRefreshing={detail.isFetching}
                    isSubmitting={
                      panel.action === "delete" ? deletion.isPending : mutations.isPending
                    }
                    onConfirm={panel.action === "delete" ? submitDelete : submitLifecycle}
                    onDiscard={closeLifecycle}
                    onRefresh={refreshContext}
                  />
                ) : null}

                <Surface padding="normal">
                  <Stack gap={5}>
                    <HStack gap={2} wrap="wrap">
                      <Badge colorPalette={statusColorPalette[activity.status]} rounded="full">
                        {activityStatusLabels[activity.status]}
                      </Badge>
                      <Badge rounded="full" variant="subtle">
                        {activityTypeLabels[activity.type]}
                      </Badge>
                      {!isActivityEditable(activity.status) ? (
                        <Badge colorPalette="gray" rounded="full">
                          {activity.status === "ONGOING" ? "Edición no disponible" : "Solo lectura"}
                        </Badge>
                      ) : null}
                    </HStack>

                    {activity.status === "CANCELLED" && activity.cancelReason ? (
                      <Text color="fg.error" role="alert">
                        Cancelada: {activity.cancelReason}
                      </Text>
                    ) : null}

                    {activity.description ? (
                      <Text color="text.default">{activity.description}</Text>
                    ) : null}

                    <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                      <DetailItem label="Programa">
                        {activity.eventProgram.label ?? activity.eventProgram.name}
                      </DetailItem>
                      <DetailItem label="Unidad">{activity.organizationalUnit.name}</DetailItem>
                      <DetailItem label="Fecha">{formatActivityDate(activity.date)}</DetailItem>
                      <DetailItem label="Horario">
                        {activity.startTime} - {activity.endTime}
                      </DetailItem>
                      <DetailItem label="Aula">
                        {activity.classroom
                          ? `${activity.classroom.name}${
                              activity.classroom.building ? `, ${activity.classroom.building}` : ""
                            }`
                          : "Sin aula asignada"}
                      </DetailItem>
                      <DetailItem label="Capacidad">
                        {activity.capacity === null
                          ? "No informada"
                          : `${activity.capacity} personas`}
                      </DetailItem>
                      <DetailItem label="Inscritos">
                        {activity.enrolledCount} · {activity.checkedInCount} con asistencia
                      </DetailItem>
                      {activity.bannerUrl ? (
                        <DetailItem label="Banner">
                          <Text as="span" wordBreak="break-all">
                            {activity.bannerUrl}
                          </Text>
                        </DetailItem>
                      ) : null}
                    </SimpleGrid>

                    <Box>
                      <Text fontWeight="700" mb={1}>
                        Ponentes
                      </Text>
                      {activity.speakers.length === 0 ? (
                        <Text color="text.muted">Sin ponentes registrados.</Text>
                      ) : (
                        <Stack gap={1}>
                          {activity.speakers.map((speaker) => (
                            <Text key={speaker.id}>
                              {speaker.firstName} {speaker.lastName}
                            </Text>
                          ))}
                        </Stack>
                      )}
                    </Box>

                    <Box>
                      <Text fontWeight="700" mb={1}>
                        Equipo requerido
                      </Text>
                      {activity.equipment.length === 0 ? (
                        <Text color="text.muted">Sin equipo registrado.</Text>
                      ) : (
                        <Text>{activity.equipment.join(", ")}</Text>
                      )}
                    </Box>
                  </Stack>
                </Surface>

                {panel === null && lifecycleActions.length > 0 ? (
                  <Surface padding="normal">
                    <Stack gap={3}>
                      <Text fontFamily="heading" fontSize="lg" fontWeight="700">
                        Acciones de ciclo de vida
                      </Text>
                      <HStack gap={3} wrap="wrap">
                        {lifecycleActions.map((action) => (
                          <Button
                            colorPalette={
                              action === "cancel" || action === "delete" ? "red" : undefined
                            }
                            key={action}
                            onClick={() => openLifecycle(action)}
                            ref={(node) => {
                              if (node) lifecycleButtonRefs.current.set(action, node);
                              else lifecycleButtonRefs.current.delete(action);
                            }}
                            rounded="full"
                            variant={action === "unpublish" ? "outline" : "solid"}
                          >
                            {lifecycleActionLabels[action]}
                          </Button>
                        ))}
                      </HStack>
                    </Stack>
                  </Surface>
                ) : null}
              </>
            ) : (
              <FeedbackState
                description="La actividad no existe, no es pública para su cuenta o dejó de estar disponible."
                title="Actividad no disponible"
              />
            )}
          </AsyncStateView>
        )}
      </Stack>
    </ModuleShell>
  );
}

function DetailItem({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <Box>
      <Text color="text.muted" fontSize="xs" fontWeight="800" textTransform="uppercase">
        {label}
      </Text>
      <Text color="text.default">{children}</Text>
    </Box>
  );
}
