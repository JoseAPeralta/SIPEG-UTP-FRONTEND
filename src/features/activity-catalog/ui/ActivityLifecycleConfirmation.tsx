import { Button, Field, HStack, Stack, Text, Textarea } from "@chakra-ui/react";
import { useState, type FormEvent } from "react";

import { Surface } from "@/components";

import type { ActivityMutationFailure } from "../adapters/activityFailure";
import type { CancelActivityRequest } from "../model/activityRequests";
import {
  ACTIVITY_CANCEL_REASON_MAX_LENGTH,
  ActivityCancelReasonError,
  buildCancelActivityRequest,
  type ActivityLifecycleAction,
} from "../model/activityLifecycle";

const confirmationLabels: Record<ActivityLifecycleAction, string> = {
  cancel: "Cancelar actividad",
  delete: "Eliminar borrador",
  publish: "Publicar actividad",
  unpublish: "Despublicar actividad",
};

const confirmationCopy: Record<
  ActivityLifecycleAction,
  { confirm: string; description: (name: string) => string }
> = {
  cancel: {
    confirm: "Confirmar cancelación",
    description: (name) =>
      `La actividad «${name}» quedará cancelada. Puede indicar un motivo opcional.`,
  },
  delete: {
    confirm: "Eliminar borrador",
    description: () =>
      "El borrador se eliminará de forma permanente. Solo puede eliminarse si no tiene registros de asistencia ni alertas; el servidor verificará esta condición.",
  },
  publish: {
    confirm: "Confirmar publicación",
    description: (name) => `La actividad «${name}» quedará disponible en la agenda pública.`,
  },
  unpublish: {
    confirm: "Confirmar despublicación",
    description: (name) =>
      `La actividad «${name}» volverá a borrador y dejará de mostrarse en la agenda pública.`,
  },
};

const deletionFailureMessages: Record<ActivityMutationFailure, string> = {
  conflict:
    "No se pudo eliminar: la actividad pudo cambiar de estado, su programa pudo dejar de estar activo o existen registros de asistencia o alertas que deben conservarse.",
  forbidden: "No tiene permisos vigentes para eliminar esta actividad.",
  invalidRequest:
    "No fue posible procesar la solicitud de eliminación. Actualice la actividad antes de volver a intentar.",
  notFound: "La actividad ya no existe o dejó de estar disponible para su cuenta.",
  unknown:
    "No se pudo confirmar la eliminación. Actualice la actividad antes de volver a intentar.",
};

function failureMessage(
  action: ActivityLifecycleAction,
  failure: ActivityMutationFailure | null,
): string | null {
  if (!failure) return null;
  if (action === "delete") return deletionFailureMessages[failure];
  if (failure === "forbidden") {
    return "No tiene permisos para administrar esta actividad. Actualice su acceso para continuar.";
  }
  if (failure === "notFound") {
    return "La actividad dejó de estar disponible; actualícela para continuar.";
  }
  if (failure === "invalidRequest") {
    return action === "cancel"
      ? `Revise el motivo: no puede superar los ${ACTIVITY_CANCEL_REASON_MAX_LENGTH} caracteres.`
      : "Revise los datos de la actividad: el cambio de estado no es válido en este momento.";
  }
  if (failure === "conflict") {
    if (action === "cancel") {
      return "No fue posible cancelar: la actividad pudo completarse o su programa dejó de estar activo. Actualice la actividad.";
    }
    if (action === "publish") {
      return "No fue posible publicar: la actividad pudo cambiar de estado, o el aula u horario incumplen sus restricciones. Actualice la actividad.";
    }

    return "No fue posible despublicar: la actividad pudo cambiar de estado. Actualice la actividad.";
  }

  return "No fue posible completar la operación. Intente de nuevo.";
}

export type ActivityLifecycleConfirmationProps = {
  action: ActivityLifecycleAction;
  activityName: string;
  failure: ActivityMutationFailure | null;
  /** Cuando es falso, la accion dejo de estar permitida tras una relectura. */
  isAllowed?: boolean;
  isRefreshing?: boolean;
  isSubmitting: boolean;
  onConfirm: (request: CancelActivityRequest) => Promise<void> | void;
  onDiscard: () => void;
  /** Relee detalle, permisos y programa sin repetir la mutacion. */
  onRefresh?: (() => void) | undefined;
};

/**
 * Confirmacion presentacional de una transicion de ciclo de vida.
 *
 * El motivo de cancelacion vive en este componente: un rechazo del servidor o una relectura del
 * detalle conservan lo escrito. La accion se deshabilita cuando deja de estar permitida, pero el
 * texto permanece visible.
 */
export function ActivityLifecycleConfirmation({
  action,
  activityName,
  failure,
  isAllowed = true,
  isRefreshing = false,
  isSubmitting,
  onConfirm,
  onDiscard,
  onRefresh,
}: ActivityLifecycleConfirmationProps) {
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const copy = confirmationCopy[action];
  const message = failureMessage(action, failure);
  const showsRefresh =
    action === "delete"
      ? Boolean(failure) || !isAllowed
      : failure === "conflict" || failure === "notFound" || failure === "forbidden";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || !isAllowed) return;

    if (action !== "cancel") {
      void onConfirm({});
      return;
    }

    let request: CancelActivityRequest;
    try {
      request = buildCancelActivityRequest(reason);
    } catch (error) {
      if (error instanceof ActivityCancelReasonError) {
        setReasonError(error.message);
        return;
      }
      throw error;
    }

    setReasonError(null);
    void onConfirm(request);
  }

  return (
    <Surface padding="normal">
      <form
        aria-label={`${confirmationLabels[action]} "${activityName}"`}
        noValidate
        onSubmit={handleSubmit}
      >
        <Stack gap={4}>
          <Text fontFamily="heading" fontSize="lg" fontWeight="700">
            {confirmationLabels[action]}
          </Text>
          <Text color="text.muted">{copy.description(activityName)}</Text>

          {action === "cancel" ? (
            <Field.Root disabled={isSubmitting} invalid={Boolean(reasonError)}>
              <Field.Label>Motivo de cancelación — opcional</Field.Label>
              <Textarea
                aria-invalid={Boolean(reasonError)}
                disabled={isSubmitting}
                onChange={(event) => {
                  setReason(event.currentTarget.value);
                  setReasonError(null);
                }}
                rows={3}
                value={reason}
              />
              <Field.ErrorText>{reasonError}</Field.ErrorText>
            </Field.Root>
          ) : null}

          {isAllowed ? null : (
            <Text color="fg.error" role="alert">
              Esta acción ya no está disponible para el estado actual de la actividad. Actualice la
              actividad para continuar o vuelva sin cambios.
            </Text>
          )}

          {message ? (
            <Text color="fg.error" role="alert">
              {message}
            </Text>
          ) : null}

          <HStack gap={3} justify="end" wrap="wrap">
            {showsRefresh && onRefresh ? (
              <Button
                disabled={isSubmitting || isRefreshing}
                onClick={onRefresh}
                type="button"
                variant="outline"
              >
                Actualizar actividad
              </Button>
            ) : null}
            <Button disabled={isSubmitting} onClick={onDiscard} type="button" variant="outline">
              Volver sin cambios
            </Button>
            <Button
              colorPalette={action === "cancel" || action === "delete" ? "red" : "terracotta"}
              disabled={isSubmitting || !isAllowed}
              loading={isSubmitting}
              loadingText={action === "delete" ? copy.confirm : "Confirmando..."}
              type="submit"
            >
              {copy.confirm}
            </Button>
          </HStack>
        </Stack>
      </form>
    </Surface>
  );
}
