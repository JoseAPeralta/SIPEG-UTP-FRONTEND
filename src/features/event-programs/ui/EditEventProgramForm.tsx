import { Button, Field, HStack, Input, SimpleGrid, Stack, Text, Textarea } from "@chakra-ui/react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Surface } from "@/components";

import type { EventProgramMutationFailure } from "../adapters/eventProgramFailure";
import type { EventProgramListItem } from "../model/eventProgramList";
import type { UpdateEventProgramRequest } from "../model/eventProgramRequests";
import {
  EVENT_PROGRAM_DESCRIPTION_MAX_LENGTH,
  EVENT_PROGRAM_LABEL_MAX_LENGTH,
  EVENT_PROGRAM_NAME_MAX_LENGTH,
  toUpdateEventProgramRequest,
  validateEventProgramUpdate,
  type EventProgramEditFormErrors,
  type EventProgramEditFormValues,
} from "../model/eventProgramValidation";

export type EditEventProgramFormProps = {
  /** Fallo tipado de la edición; nunca el mensaje interno del backend. */
  failure: EventProgramMutationFailure | null;
  isSubmitting: boolean;
  /** Lectura explícita del listado tras un conflicto; no repite la mutación. */
  onRefresh?: (() => void) | undefined;
  onCancel: () => void;
  onSubmit: (request: UpdateEventProgramRequest) => Promise<void> | void;
  /** Registro validado del listado; la unidad propietaria y `isDefault` no se editan. */
  program: EventProgramListItem;
  /** Verdadero mientras la lectura de refresco está en curso. */
  isRefreshing?: boolean;
};

function editValues(program: EventProgramListItem): EventProgramEditFormValues {
  return {
    description: program.description ?? "",
    endDate: program.endDate ?? "",
    label: program.label ?? "",
    name: program.name,
    startDate: program.startDate ?? "",
  };
}

function failureMessage(
  failure: EventProgramMutationFailure | null,
  isDefault: boolean,
): string | null {
  if (failure === "conflict")
    return "No fue posible guardar: el programa pudo ser archivado por otra persona o las fechas dejan actividades existentes fuera del rango.";
  if (failure === "invalidRequest")
    return isDefault
      ? "Revise los datos del programa e intente de nuevo."
      : "Revise las fechas: deben ser válidas y el contrato no acepta fechas sin coherencia.";
  if (failure === "forbidden") return "No tiene permisos para editar programas.";
  if (failure === "notFound") return "El programa ya no existe en el listado.";

  return failure ? "No fue posible guardar los cambios. Intente de nuevo." : null;
}

/**
 * Edita los campos que el contrato permite. La unidad propietaria y `isDefault` se muestran en solo
 * lectura, la agenda permanente omite las fechas y un rechazo del servidor conserva lo escrito.
 */
export function EditEventProgramForm({
  failure,
  isRefreshing = false,
  isSubmitting,
  onCancel,
  onRefresh,
  onSubmit,
  program,
}: EditEventProgramFormProps) {
  const [values, setValues] = useState<EventProgramEditFormValues>(() => editValues(program));
  const [errors, setErrors] = useState<EventProgramEditFormErrors>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);
  const message = failureMessage(failure, program.isDefault);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  function update(field: keyof EventProgramEditFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function focusFirstInvalid(nextErrors: EventProgramEditFormErrors) {
    if (nextErrors.name) return nameRef.current?.focus();
    if (nextErrors.startDate) return startRef.current?.focus();
    if (nextErrors.endDate) return endRef.current?.focus();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateEventProgramUpdate(values, { isDefault: program.isDefault });
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      focusFirstInvalid(nextErrors);
      return;
    }

    void onSubmit(toUpdateEventProgramRequest(values, { isDefault: program.isDefault }));
  }

  return (
    <Surface padding="normal">
      <form aria-label="Editar programa" noValidate onSubmit={handleSubmit}>
        <Stack gap={4}>
          <Text fontFamily="heading" fontSize="lg" fontWeight="700">
            Editar programa
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            <Field.Root disabled={isSubmitting} invalid={Boolean(errors.name)} required>
              <Field.Label>Nombre</Field.Label>
              <Input
                disabled={isSubmitting}
                maxLength={EVENT_PROGRAM_NAME_MAX_LENGTH}
                onChange={(event) => update("name", event.currentTarget.value)}
                ref={nameRef}
                value={values.name}
              />
              <Field.ErrorText>{errors.name}</Field.ErrorText>
            </Field.Root>

            <Field.Root disabled>
              <Field.Label>Unidad</Field.Label>
              <Input aria-label="Unidad" disabled value={program.organizationalUnit.name} />
            </Field.Root>

            {program.isDefault ? null : (
              <>
                <Field.Root disabled={isSubmitting} invalid={Boolean(errors.startDate)} required>
                  <Field.Label>Fecha inicial</Field.Label>
                  <Input
                    disabled={isSubmitting}
                    onChange={(event) => update("startDate", event.currentTarget.value)}
                    ref={startRef}
                    type="date"
                    value={values.startDate}
                  />
                  <Field.ErrorText>{errors.startDate}</Field.ErrorText>
                </Field.Root>

                <Field.Root disabled={isSubmitting} invalid={Boolean(errors.endDate)} required>
                  <Field.Label>Fecha final</Field.Label>
                  <Input
                    disabled={isSubmitting}
                    onChange={(event) => update("endDate", event.currentTarget.value)}
                    ref={endRef}
                    type="date"
                    value={values.endDate}
                  />
                  <Field.ErrorText>{errors.endDate}</Field.ErrorText>
                </Field.Root>
              </>
            )}

            <Field.Root disabled={isSubmitting} invalid={Boolean(errors.label)}>
              <Field.Label>Etiqueta</Field.Label>
              <Input
                disabled={isSubmitting}
                maxLength={EVENT_PROGRAM_LABEL_MAX_LENGTH}
                onChange={(event) => update("label", event.currentTarget.value)}
                value={values.label}
              />
              <Field.ErrorText>{errors.label}</Field.ErrorText>
            </Field.Root>
          </SimpleGrid>

          <Field.Root disabled={isSubmitting} invalid={Boolean(errors.description)}>
            <Field.Label>Descripción</Field.Label>
            <Textarea
              disabled={isSubmitting}
              maxLength={EVENT_PROGRAM_DESCRIPTION_MAX_LENGTH}
              onChange={(event) => update("description", event.currentTarget.value)}
              value={values.description}
            />
            <Field.ErrorText>{errors.description}</Field.ErrorText>
          </Field.Root>

          {message ? (
            <Text color="fg.error" role="alert">
              {message}
            </Text>
          ) : null}

          {program.isDefault ? (
            <Text color="text.muted" fontSize="sm">
              La agenda permanente no tiene fechas; su ciclo de vida lo controla la unidad.
            </Text>
          ) : null}

          <HStack gap={3} justify="end" wrap="wrap">
            {onRefresh && (failure === "conflict" || failure === "notFound") ? (
              <Button
                disabled={isSubmitting || isRefreshing}
                onClick={onRefresh}
                type="button"
                variant="outline"
              >
                Actualizar listado
              </Button>
            ) : null}
            <Button disabled={isSubmitting} onClick={onCancel} type="button" variant="outline">
              Cancelar
            </Button>
            <Button
              colorPalette="terracotta"
              disabled={isSubmitting}
              loading={isSubmitting}
              loadingText="Guardando..."
              type="submit"
            >
              Guardar cambios
            </Button>
          </HStack>
        </Stack>
      </form>
    </Surface>
  );
}
