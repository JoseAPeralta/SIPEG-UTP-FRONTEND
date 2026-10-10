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
import { ClassroomAvailabilitySelector, type ClassroomSelection } from "@/features/classrooms";
import type { ActivityType } from "@/types/domain";

import type { ActivityMutationFailure } from "../adapters/activityFailure";
import type { AdministrativeActivityDetail } from "../model/administrativeActivity";
import { ACTIVITY_TYPE_ORDER } from "../model/administrativeActivity";
import type { CreateActivityRequest, UpdateActivityRequest } from "../model/activityRequests";
import {
  activityFormValuesFromDetail,
  ACTIVITY_BANNER_MAX_LENGTH,
  ACTIVITY_DESCRIPTION_MAX_LENGTH,
  ACTIVITY_NAME_MAX_LENGTH,
  EMPTY_ACTIVITY_FORM_VALUES,
  hasActivityFormErrors,
  parseCapacityValue,
  toCreateActivityRequest,
  toUpdateActivityRequest,
  validateActivityValues,
  type ActivityFormErrors,
  type ActivityFormValues,
  type ActivitySpeakerFormErrors,
  type ActivitySpeakerFormValue,
} from "../model/activityValidation";
import { activityTypeLabels } from "../model/catalogLabels";

type ActivityFormCommonProps = {
  failure: ActivityMutationFailure | null;
  isSubmitting: boolean;
  onCancel: () => void;
  /** Relee la actividad tras un conflicto o un `404`; no repite la mutacion. */
  onRefresh?: (() => void) | undefined;
  isRefreshing?: boolean;
  /** Programa propietario: se elige al crear y es inmutable al editar. */
  programName: string;
};

export type ActivityFormProps = ActivityFormCommonProps &
  (
    | {
        mode: "create";
        onSubmit: (request: CreateActivityRequest) => Promise<void> | void;
        original?: never;
        programId: string;
      }
    | {
        mode: "edit";
        onSubmit: (request: UpdateActivityRequest) => Promise<void> | void;
        original: AdministrativeActivityDetail;
        programId?: never;
      }
  );

function failureMessage(failure: ActivityMutationFailure | null, mode: "create" | "edit") {
  if (!failure) return null;
  if (failure === "forbidden") return "No tiene permisos para administrar actividades.";
  if (failure === "notFound") {
    return mode === "edit"
      ? "La actividad ya no existe o su aula ya no está disponible; actualice los datos."
      : "El programa o el aula seleccionada ya no están disponibles.";
  }
  if (failure === "conflict") {
    return "No fue posible guardar: la actividad pudo cambiar de estado, el aula pudo ser reservada por otra actividad o el horario queda fuera de su ventana de disponibilidad. Verifique el aula o el horario y vuelva a intentar.";
  }
  if (failure === "invalidRequest") {
    return "Revise los datos: la capacidad no puede superar la del aula, y la fecha y las horas deben ser válidas.";
  }

  return "No fue posible guardar la actividad. Intente de nuevo.";
}

function emptySpeaker(): ActivitySpeakerFormValue {
  return { email: "", firstName: "", lastName: "", organization: "" };
}

/**
 * Formulario unico de alta y edicion de actividades.
 *
 * El contrato comparte campos entre `POST` y `PATCH`; la diferencia vive en la construccion del
 * request: el alta fija el programa y el borrador, y la edicion envia solo los campos modificados,
 * con los ponentes unicamente cuando la persona los edito (el detalle no devuelve su correo ni su
 * organizacion). Un rechazo del servidor conserva todo lo escrito y el selector de aulas mantiene
 * la asignacion original sin afirmar que esta disponible.
 */
export function ActivityForm(props: ActivityFormProps) {
  const { failure, isSubmitting, onCancel, onRefresh, isRefreshing = false, programName } = props;
  const isEdit = props.mode === "edit";
  const [values, setValues] = useState<ActivityFormValues>(() =>
    props.mode === "edit"
      ? activityFormValuesFromDetail(props.original)
      : EMPTY_ACTIVITY_FORM_VALUES,
  );
  const [errors, setErrors] = useState<ActivityFormErrors>({});
  const [speakersDirty, setSpeakersDirty] = useState(false);
  const [selection, setSelection] = useState<ClassroomSelection | null>(() => {
    if (props.mode !== "edit" || !props.original.classroom) return null;

    return { id: props.original.classroom.id, label: props.original.classroom.name };
  });
  const nameRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);
  const capacityRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const equipmentRef = useRef<HTMLTextAreaElement>(null);
  const speakerRef = useRef<HTMLInputElement>(null);
  const assignedClassroom =
    props.mode === "edit" && props.original.classroom
      ? { id: props.original.classroom.id, name: props.original.classroom.name }
      : null;
  const message = failureMessage(failure, props.mode);
  const minimumCapacity = parseCapacityValue(values.capacity);
  const criteria = {
    date: values.date,
    endTime: values.endTime,
    startTime: values.startTime,
    ...(minimumCapacity === undefined ? {} : { minCapacity: minimumCapacity }),
  };

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  function update<K extends keyof ActivityFormValues>(field: K, value: ActivityFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function updateSpeaker(index: number, field: keyof ActivitySpeakerFormValue, value: string) {
    setSpeakersDirty(true);
    setValues((current) => ({
      ...current,
      speakers: current.speakers.map((speaker, position) =>
        position === index ? { ...speaker, [field]: value } : speaker,
      ),
    }));
    setErrors((current) => {
      const speakerErrors = current.speakers?.map((entry, position) =>
        position === index ? { ...entry, [field]: undefined } : entry,
      );
      if (!speakerErrors) return current;

      return { ...current, speakers: speakerErrors };
    });
  }

  function addSpeaker() {
    setSpeakersDirty(true);
    setValues((current) => ({ ...current, speakers: [...current.speakers, emptySpeaker()] }));
  }

  function removeSpeaker(index: number) {
    setSpeakersDirty(true);
    setValues((current) => ({
      ...current,
      speakers: current.speakers.filter((_speaker, position) => position !== index),
    }));
  }

  function focusFirstInvalid(nextErrors: ActivityFormErrors) {
    if (nextErrors.name) return nameRef.current?.focus();
    if (nextErrors.type) return typeRef.current?.focus();
    if (nextErrors.date) return dateRef.current?.focus();
    if (nextErrors.startTime) return startRef.current?.focus();
    if (nextErrors.endTime) return endRef.current?.focus();
    if (nextErrors.capacity) return capacityRef.current?.focus();
    if (nextErrors.bannerUrl) return bannerRef.current?.focus();
    if (nextErrors.equipment) return equipmentRef.current?.focus();
    if (nextErrors.speakers?.some((entry) => entry !== undefined)) {
      return speakerRef.current?.focus();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const originalBannerUrl =
      props.mode === "edit" ? (props.original.bannerUrl ?? undefined) : undefined;
    const nextErrors = validateActivityValues(values, {
      ...(originalBannerUrl === undefined ? {} : { originalBannerUrl }),
    });
    setErrors(nextErrors);

    if (hasActivityFormErrors(nextErrors)) {
      focusFirstInvalid(nextErrors);
      return;
    }

    const requestValues: ActivityFormValues = { ...values, classroomId: selection?.id ?? "" };

    if (props.mode === "create") {
      void props.onSubmit(
        toCreateActivityRequest(requestValues, { eventProgramId: props.programId }),
      );
      return;
    }

    void props.onSubmit(
      toUpdateActivityRequest(requestValues, {
        original: props.original,
        speakersDirty,
      }),
    );
  }

  function speakerErrors(index: number): ActivitySpeakerFormErrors | undefined {
    return errors.speakers?.[index];
  }

  return (
    <Surface padding="normal">
      <form
        aria-label={isEdit ? "Editar actividad" : "Nueva actividad"}
        noValidate
        onSubmit={handleSubmit}
      >
        <Stack gap={4}>
          <Text fontFamily="heading" fontSize="lg" fontWeight="700">
            {isEdit ? "Editar actividad" : "Nueva actividad"}
          </Text>

          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            <Field.Root disabled={isSubmitting} invalid={Boolean(errors.name)} required>
              <Field.Label>Nombre</Field.Label>
              <Input
                disabled={isSubmitting}
                maxLength={ACTIVITY_NAME_MAX_LENGTH}
                onChange={(event) => update("name", event.currentTarget.value)}
                ref={nameRef}
                value={values.name}
              />
              <Field.ErrorText>{errors.name}</Field.ErrorText>
            </Field.Root>

            <Field.Root disabled={isSubmitting} invalid={Boolean(errors.type)} required>
              <Field.Label>Tipo</Field.Label>
              <NativeSelect.Root disabled={isSubmitting}>
                <NativeSelect.Field
                  onChange={(event) => update("type", event.currentTarget.value as ActivityType)}
                  ref={typeRef}
                  value={values.type}
                >
                  <option value="">Seleccione un tipo</option>
                  {ACTIVITY_TYPE_ORDER.map((type) => (
                    <option key={type} value={type}>
                      {activityTypeLabels[type]}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
              <Field.ErrorText>{errors.type}</Field.ErrorText>
            </Field.Root>

            <Field.Root disabled={isSubmitting} invalid={Boolean(errors.date)} required>
              <Field.Label>Fecha</Field.Label>
              <Input
                disabled={isSubmitting}
                onChange={(event) => update("date", event.currentTarget.value)}
                ref={dateRef}
                type="date"
                value={values.date}
              />
              <Field.ErrorText>{errors.date}</Field.ErrorText>
            </Field.Root>

            <Field.Root disabled={isSubmitting} invalid={Boolean(errors.capacity)}>
              <Field.Label>Capacidad</Field.Label>
              <Input
                disabled={isSubmitting}
                min={1}
                onChange={(event) => update("capacity", event.currentTarget.value)}
                ref={capacityRef}
                type="number"
                value={values.capacity}
              />
              <Field.ErrorText>{errors.capacity}</Field.ErrorText>
            </Field.Root>

            <Field.Root disabled={isSubmitting} invalid={Boolean(errors.startTime)} required>
              <Field.Label>Hora de inicio</Field.Label>
              <Input
                disabled={isSubmitting}
                onChange={(event) => update("startTime", event.currentTarget.value)}
                ref={startRef}
                type="time"
                value={values.startTime}
              />
              <Field.ErrorText>{errors.startTime}</Field.ErrorText>
            </Field.Root>

            <Field.Root disabled={isSubmitting} invalid={Boolean(errors.endTime)} required>
              <Field.Label>Hora de fin</Field.Label>
              <Input
                disabled={isSubmitting}
                onChange={(event) => update("endTime", event.currentTarget.value)}
                ref={endRef}
                type="time"
                value={values.endTime}
              />
              <Field.ErrorText>{errors.endTime}</Field.ErrorText>
            </Field.Root>

            <Field.Root disabled={isSubmitting} invalid={Boolean(errors.bannerUrl)}>
              <Field.Label>Banner (URL)</Field.Label>
              <Input
                disabled={isSubmitting}
                maxLength={ACTIVITY_BANNER_MAX_LENGTH}
                onChange={(event) => update("bannerUrl", event.currentTarget.value)}
                placeholder="https://ejemplo.com/banner.png"
                ref={bannerRef}
                value={values.bannerUrl}
              />
              <Field.ErrorText>{errors.bannerUrl}</Field.ErrorText>
            </Field.Root>

            <Field.Root disabled>
              <Field.Label>Programa</Field.Label>
              <Input aria-label="Programa" disabled value={programName} />
            </Field.Root>
          </SimpleGrid>

          <Field.Root disabled={isSubmitting} invalid={Boolean(errors.description)}>
            <Field.Label>Descripción</Field.Label>
            <Textarea
              disabled={isSubmitting}
              maxLength={ACTIVITY_DESCRIPTION_MAX_LENGTH}
              onChange={(event) => update("description", event.currentTarget.value)}
              value={values.description}
            />
            <Field.ErrorText>{errors.description}</Field.ErrorText>
          </Field.Root>

          <Field.Root disabled={isSubmitting} invalid={Boolean(errors.equipment)}>
            <Field.Label>Equipo requerido</Field.Label>
            <Textarea
              disabled={isSubmitting}
              onChange={(event) => update("equipment", event.currentTarget.value)}
              placeholder={"Un elemento por línea\nProyector\nAudio"}
              ref={equipmentRef}
              value={values.equipment}
            />
            <Field.ErrorText>{errors.equipment}</Field.ErrorText>
          </Field.Root>

          <Stack gap={3}>
            <HStack justify="space-between" wrap="wrap">
              <Text fontWeight="700">Ponentes</Text>
              <Button
                disabled={isSubmitting || values.speakers.length >= 10}
                onClick={addSpeaker}
                size="sm"
                type="button"
                variant="outline"
              >
                Agregar ponente
              </Button>
            </HStack>
            {errors.speakersLimit ? (
              <Text color="fg.error" role="alert">
                {errors.speakersLimit}
              </Text>
            ) : null}
            {values.speakers.length === 0 ? (
              <Text color="text.muted" fontSize="sm">
                Sin ponentes registrados. Puede agregarlos ahora o conservar los existentes al
                editar otro campo.
              </Text>
            ) : null}
            {values.speakers.map((speaker, index) => (
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={3} key={`speaker-${index}`}>
                <Field.Root
                  disabled={isSubmitting}
                  invalid={Boolean(speakerErrors(index)?.firstName)}
                >
                  <Field.Label>Nombre del ponente {index + 1}</Field.Label>
                  <Input
                    disabled={isSubmitting}
                    onChange={(event) =>
                      updateSpeaker(index, "firstName", event.currentTarget.value)
                    }
                    ref={index === 0 ? speakerRef : undefined}
                    value={speaker.firstName}
                  />
                  <Field.ErrorText>{speakerErrors(index)?.firstName}</Field.ErrorText>
                </Field.Root>
                <Field.Root
                  disabled={isSubmitting}
                  invalid={Boolean(speakerErrors(index)?.lastName)}
                >
                  <Field.Label>Apellido del ponente {index + 1}</Field.Label>
                  <Input
                    disabled={isSubmitting}
                    onChange={(event) =>
                      updateSpeaker(index, "lastName", event.currentTarget.value)
                    }
                    value={speaker.lastName}
                  />
                  <Field.ErrorText>{speakerErrors(index)?.lastName}</Field.ErrorText>
                </Field.Root>
                <Field.Root disabled={isSubmitting} invalid={Boolean(speakerErrors(index)?.email)}>
                  <Field.Label>Correo del ponente {index + 1}</Field.Label>
                  <Input
                    disabled={isSubmitting}
                    onChange={(event) => updateSpeaker(index, "email", event.currentTarget.value)}
                    type="email"
                    value={speaker.email}
                  />
                  <Field.ErrorText>{speakerErrors(index)?.email}</Field.ErrorText>
                </Field.Root>
                <Field.Root
                  disabled={isSubmitting}
                  invalid={Boolean(speakerErrors(index)?.organization)}
                >
                  <Field.Label>Organización del ponente {index + 1}</Field.Label>
                  <HStack align="start">
                    <Input
                      disabled={isSubmitting}
                      onChange={(event) =>
                        updateSpeaker(index, "organization", event.currentTarget.value)
                      }
                      value={speaker.organization}
                    />
                    <Button
                      disabled={isSubmitting}
                      onClick={() => removeSpeaker(index)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Quitar
                    </Button>
                  </HStack>
                  <Field.ErrorText>{speakerErrors(index)?.organization}</Field.ErrorText>
                </Field.Root>
              </SimpleGrid>
            ))}
          </Stack>

          <ClassroomAvailabilitySelector
            assignedClassroom={assignedClassroom}
            criteria={criteria}
            disabled={isSubmitting}
            onSelectionChange={setSelection}
            selected={selection}
          />

          {message ? (
            <Text color="fg.error" role="alert">
              {message}
            </Text>
          ) : null}

          <Text color="text.muted" fontSize="sm">
            {isEdit
              ? "Solo se enviarán los campos modificados; los ponentes solo cuando los edite aquí."
              : "La actividad se creará como borrador del programa y podrá publicarse después."}
          </Text>

          <HStack gap={3} justify="end" wrap="wrap">
            {isEdit && onRefresh && (failure === "conflict" || failure === "notFound") ? (
              <Button
                disabled={isSubmitting || isRefreshing}
                onClick={onRefresh}
                type="button"
                variant="outline"
              >
                Actualizar actividad
              </Button>
            ) : null}
            <Button disabled={isSubmitting} onClick={onCancel} type="button" variant="outline">
              Cancelar
            </Button>
            <Button
              colorPalette="terracotta"
              disabled={isSubmitting}
              loading={isSubmitting}
              loadingText={isEdit ? "Guardando..." : "Creando actividad"}
              type="submit"
            >
              {isEdit ? "Guardar cambios" : "Crear actividad"}
            </Button>
          </HStack>
        </Stack>
      </form>
    </Surface>
  );
}
