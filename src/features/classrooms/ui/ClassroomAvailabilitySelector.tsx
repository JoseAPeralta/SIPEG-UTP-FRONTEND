import { Button, Field, NativeSelect, Stack, Text } from "@chakra-ui/react";
import type { ChangeEvent } from "react";

import { AsyncStateView, FeedbackState, Surface } from "@/components";
import type { Classroom } from "@/types/domain";

import { useAvailableClassrooms } from "../hooks/useAvailableClassrooms";
import {
  areAvailableClassroomsCriteriaEqual,
  isAvailableClassroomsCriteriaValid,
  type AvailableClassroomsCriteria,
} from "../model/availableClassrooms";
import { classroomTypeLabels, resolveAmenityLabel } from "../model/classroomLabels";

/**
 * Aula elegida: el identificador que viaja al request y la etiqueta visible.
 *
 * La etiqueta se conserva porque una busqueda posterior puede dejar de devolver el aula elegida y
 * la opcion necesita un texto honesto, sin inventar datos de disponibilidad.
 */
export type ClassroomSelection = {
  id: string;
  label: string;
};

export type ClassroomAvailabilitySelectorProps = {
  /** Aula asignada de la actividad en edicion; se muestra aunque la consulta ya no la devuelva. */
  assignedClassroom?: { id: string; name: string } | null;
  /** The current activity need. Changing it does not query until the user requests another search. */
  criteria: AvailableClassroomsCriteria;
  disabled?: boolean;
  /** Recibe `null` al limpiar la asignación o el aula elegida con su etiqueta. */
  onSelectionChange: (selection: ClassroomSelection | null) => void;
  /** The parent owns the selection so it can preserve unsaved form data across a failed search. */
  selected: ClassroomSelection | null;
};

function classroomOptionLabel(classroom: Classroom): string {
  const amenities = classroom.amenities.map(resolveAmenityLabel).join(", ");
  const type = classroomTypeLabels[classroom.type];

  return `${classroom.name} · ${type} · ${classroom.capacity} personas${
    amenities ? ` · ${amenities}` : ""
  }`;
}

function assignedOptionLabel(name: string): string {
  return `${name} · Aula asignada; se validará al guardar`;
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
 * Selects a room from the backend-authoritative availability result.
 *
 * It intentionally receives the activity criteria instead of collecting a second copy of date,
 * time, capacity and requirements. Results belong to the submitted snapshot: if the criteria
 * change, the options become unpickable until the user searches again, but clearing the assignment
 * and returning to the assigned room keep working.
 */
export function ClassroomAvailabilitySelector({
  assignedClassroom = null,
  criteria,
  disabled = false,
  onSelectionChange,
  selected,
}: ClassroomAvailabilitySelectorProps) {
  const availability = useAvailableClassrooms();
  const canSearch = isAvailableClassroomsCriteriaValid(criteria);
  const failure = failureMessage(availability.failure);
  const classrooms = availability.classrooms;
  const resultsAreStale =
    availability.criteria !== null &&
    !areAvailableClassroomsCriteriaEqual(availability.criteria, criteria);
  const resultsOptionDisabled = disabled || availability.isLoading || resultsAreStale;
  const assignedIsInResults =
    assignedClassroom !== null &&
    classrooms?.some((classroom) => classroom.id === assignedClassroom.id);
  const selectedId = selected?.id ?? null;
  const selectedIsMissing =
    selectedId !== null &&
    classrooms !== null &&
    !resultsAreStale &&
    selectedId !== assignedClassroom?.id &&
    !classrooms.some((classroom) => classroom.id === selectedId);

  function selectClassroom(event: ChangeEvent<HTMLSelectElement>) {
    const classroomId = event.target.value;
    if (!classroomId) {
      onSelectionChange(null);
      return;
    }

    const classroom = classrooms?.find((candidate) => candidate.id === classroomId);
    if (classroom) {
      onSelectionChange({ id: classroom.id, label: classroomOptionLabel(classroom) });
      return;
    }
    if (!assignedClassroom) return;
    if (classroomId !== assignedClassroom.id) return;

    onSelectionChange({
      id: assignedClassroom.id,
      label: assignedOptionLabel(assignedClassroom.name),
    });
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
          {resultsAreStale ? (
            <Text color="text.muted" role="status">
              Los criterios cambiaron desde la última consulta. Consulte las aulas de nuevo para
              elegir otra.
            </Text>
          ) : null}
          {selectedIsMissing ? (
            <Text color="fg.error" role="alert">
              El aula seleccionada ya no está disponible para estos criterios.
            </Text>
          ) : null}
          {classrooms !== null || assignedClassroom ? (
            <Field.Root>
              <Field.Label>Aula disponible</Field.Label>
              <NativeSelect.Root disabled={disabled || availability.isLoading}>
                <NativeSelect.Field onChange={selectClassroom} value={selected?.id ?? ""}>
                  <option value="">Sin aula asignada</option>
                  {assignedClassroom && !assignedIsInResults ? (
                    <option value={assignedClassroom.id}>
                      {assignedOptionLabel(assignedClassroom.name)}
                    </option>
                  ) : null}
                  {selectedIsMissing && selected ? (
                    <option disabled value={selected.id}>
                      {selected.label} (no disponible)
                    </option>
                  ) : null}
                  {(classrooms ?? []).map((classroom) => (
                    <option
                      disabled={resultsOptionDisabled}
                      key={classroom.id}
                      value={classroom.id}
                    >
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
