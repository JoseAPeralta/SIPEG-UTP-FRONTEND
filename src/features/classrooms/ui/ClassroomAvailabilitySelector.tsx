import { Button, Field, NativeSelect, Stack, Text } from "@chakra-ui/react";
import type { ChangeEvent } from "react";

import { AsyncStateView, FeedbackState, Surface } from "@/components";
import type { Classroom } from "@/types/domain";

import { useAvailableClassrooms } from "../hooks/useAvailableClassrooms";
import {
  isAvailableClassroomsCriteriaValid,
  type AvailableClassroomsCriteria,
} from "../model/availableClassrooms";
import { classroomTypeLabels, resolveAmenityLabel } from "../model/classroomLabels";

export type ClassroomAvailabilitySelectorProps = {
  /** The current activity need. Changing it does not query until the user requests another search. */
  criteria: AvailableClassroomsCriteria;
  disabled?: boolean;
  /** Receives the complete classroom summary or `null` when the assignment is cleared. */
  onSelectionChange: (classroom: Classroom | null) => void;
  /** The parent owns the selection so it can preserve unsaved form data across a failed search. */
  selectedClassroom: Classroom | null;
};

function classroomOptionLabel(classroom: Classroom): string {
  const amenities = classroom.amenities.map(resolveAmenityLabel).join(", ");
  const type = classroomTypeLabels[classroom.type];

  return `${classroom.name} · ${type} · ${classroom.capacity} personas${
    amenities ? ` · ${amenities}` : ""
  }`;
}

function failureMessage(
  failure: ReturnType<typeof useAvailableClassrooms>["failure"],
): string | null {
  if (failure === "invalidRequest") {
    return "Revise la fecha, el horario y la capacidad antes de consultar las aulas.";
  }

  return failure ? "No fue posible consultar las aulas disponibles. Intente de nuevo." : null;
}

/**
 * Selects a room from the backend-authoritative availability result. It intentionally receives the
 * activity criteria instead of collecting a second copy of date, time, capacity and requirements.
 */
export function ClassroomAvailabilitySelector({
  criteria,
  disabled = false,
  onSelectionChange,
  selectedClassroom,
}: ClassroomAvailabilitySelectorProps) {
  const availability = useAvailableClassrooms();
  const canSearch = isAvailableClassroomsCriteriaValid(criteria);
  const failure = failureMessage(availability.failure);
  const classrooms = availability.classrooms;
  const selectedIsUnavailable =
    selectedClassroom !== null &&
    classrooms?.every((classroom) => classroom.id !== selectedClassroom.id) === true;

  function selectClassroom(event: ChangeEvent<HTMLSelectElement>) {
    const classroomId = event.target.value;
    if (!classroomId) {
      onSelectionChange(null);
      return;
    }

    const classroom = classrooms?.find((candidate) => candidate.id === classroomId);
    if (classroom) onSelectionChange(classroom);
  }

  return (
    <Surface padding="normal">
      <Stack gap={4}>
        <Stack gap={1}>
          <Text fontFamily="heading" fontSize="lg" fontWeight="700">
            Aula
          </Text>
          <Text color="text.muted" fontSize="sm">
            Consulte las aulas que cumplen la fecha, horario, capacidad, tipo y amenidad requeridos.
          </Text>
        </Stack>
        <Button
          alignSelf="start"
          colorPalette="terracotta"
          disabled={disabled || !canSearch || availability.isLoading}
          loading={availability.isLoading}
          minH="44px"
          onClick={() => availability.search(criteria)}
          type="button"
        >
          Consultar aulas
        </Button>
        <AsyncStateView
          error={failure ? new Error(failure) : null}
          isLoading={availability.isLoading}
          onRetry={() => availability.search(criteria)}
        >
          {classrooms === null ? (
            <FeedbackState
              description="Complete la fecha y el horario de la actividad y consulte las aulas disponibles."
              title="Aún no se ha consultado la disponibilidad"
            />
          ) : classrooms.length === 0 ? (
            <FeedbackState
              description="Ajuste la necesidad de la actividad y vuelva a consultar otros horarios o requisitos."
              title="No hay aulas disponibles para estos criterios"
            />
          ) : null}
          {selectedIsUnavailable ? (
            <Text color="fg.error" role="alert">
              El aula seleccionada ya no está disponible para estos criterios.
            </Text>
          ) : null}
          {classrooms !== null ? (
            <Field.Root>
              <Field.Label>Aula disponible</Field.Label>
              <NativeSelect.Root disabled={disabled || availability.isLoading}>
                <NativeSelect.Field onChange={selectClassroom} value={selectedClassroom?.id ?? ""}>
                  <option value="">Sin aula asignada</option>
                  {selectedIsUnavailable ? (
                    <option disabled value={selectedClassroom.id}>
                      {classroomOptionLabel(selectedClassroom)} (no disponible)
                    </option>
                  ) : null}
                  {classrooms.map((classroom) => (
                    <option key={classroom.id} value={classroom.id}>
                      {classroomOptionLabel(classroom)}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>
          ) : null}
        </AsyncStateView>
      </Stack>
    </Surface>
  );
}
