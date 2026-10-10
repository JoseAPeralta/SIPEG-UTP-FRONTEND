import {
  Button,
  Field,
  HStack,
  Input,
  NativeSelect,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Surface } from "@/components";
import type { OrganizationalUnit } from "@/types/domain";

import type { EventProgramMutationFailure } from "../adapters/eventProgramFailure";
import type { CreateEventProgramRequest } from "../model/eventProgramRequests";
import {
  EVENT_PROGRAM_DESCRIPTION_MAX_LENGTH,
  EVENT_PROGRAM_LABEL_MAX_LENGTH,
  EVENT_PROGRAM_NAME_MAX_LENGTH,
  toCreateEventProgramRequest,
  validateEventProgramDraft,
  type EventProgramFormErrors,
  type EventProgramFormValues,
} from "../model/eventProgramValidation";

const EMPTY_VALUES: EventProgramFormValues = {
  description: "",
  endDate: "",
  label: "",
  name: "",
  organizationalUnitId: "",
  startDate: "",
};

export type CreateEventProgramFormProps = {
  /** Fallo tipado de la creación; nunca el mensaje interno del backend. */
  failure: EventProgramMutationFailure | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (request: CreateEventProgramRequest) => Promise<void> | void;
  /** Solo unidades activas: la misma lista que exige el contrato para crear. */
  units: OrganizationalUnit[];
};

function failureMessage(failure: EventProgramMutationFailure | null) {
  if (failure === "invalidRequest")
    return "Revise las fechas y que la unidad siga activa; el programa no se creó.";
  if (failure === "forbidden") return "No tiene permisos para crear programas.";
  if (failure === "notFound") return "La unidad seleccionada ya no está disponible.";
  return failure ? "No fue posible crear el programa. Intente de nuevo." : null;
}

/**
 * Crea un programa adicional en borrador. Valida fechas reales y unidad activa antes del envío y
 * conserva lo escrito ante un rechazo del servidor, que se explica con un mensaje localizado.
 */
export function CreateEventProgramForm({
  failure,
  isSubmitting,
  onCancel,
  onSubmit,
  units,
}: CreateEventProgramFormProps) {
  const [values, setValues] = useState(EMPTY_VALUES);
  const [errors, setErrors] = useState<EventProgramFormErrors>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const unitRef = useRef<HTMLSelectElement>(null);
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);
  const message = failureMessage(failure);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  function update(field: keyof EventProgramFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function focusFirstInvalid(nextErrors: EventProgramFormErrors) {
    if (nextErrors.name) return nameRef.current?.focus();
    if (nextErrors.organizationalUnitId) return unitRef.current?.focus();
    if (nextErrors.startDate) return startRef.current?.focus();
    if (nextErrors.endDate) return endRef.current?.focus();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateEventProgramDraft(
      values,
      units.map((unit) => unit.id),
    );
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      focusFirstInvalid(nextErrors);
      return;
    }

    void onSubmit(toCreateEventProgramRequest(values));
  }

  return (
    <Surface padding="normal">
      <form aria-label="Nuevo programa" noValidate onSubmit={handleSubmit}>
        <Stack gap={4}>
          <Text fontFamily="heading" fontSize="lg" fontWeight="700">
            Nuevo programa
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

            <Field.Root
              disabled={isSubmitting}
              invalid={Boolean(errors.organizationalUnitId)}
              required
            >
              <Field.Label>Unidad</Field.Label>
              <NativeSelect.Root disabled={isSubmitting}>
                <NativeSelect.Field
                  onChange={(event) => update("organizationalUnitId", event.currentTarget.value)}
                  ref={unitRef}
                  value={values.organizationalUnitId}
                >
                  <option value="">Seleccione una unidad</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
              <Field.ErrorText>{errors.organizationalUnitId}</Field.ErrorText>
            </Field.Root>

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

          <Text color="text.muted" fontSize="sm">
            El programa se creará como borrador de la unidad seleccionada.
          </Text>

          <HStack gap={3} justify="end" wrap="wrap">
            <Button disabled={isSubmitting} onClick={onCancel} type="button" variant="outline">
              Cancelar
            </Button>
            <Button
              colorPalette="terracotta"
              disabled={isSubmitting}
              loading={isSubmitting}
              loadingText="Creando programa"
              type="submit"
            >
              Crear programa
            </Button>
          </HStack>
        </Stack>
      </form>
    </Surface>
  );
}
