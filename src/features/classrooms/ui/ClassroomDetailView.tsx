import {
  Box,
  Button,
  Field,
  Heading,
  HStack,
  Input,
  NativeSelect,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useState } from "react";
import { Link as RouterLink } from "react-router";

import { AsyncStateView, FeedbackState, ModuleShell, SectionHeader, Surface } from "@/components";
import type { ClassroomFailure } from "../adapters/classroomFailure";
import { useClassroomDetail } from "../hooks/useClassroomDetail";
import { useClassroomMutations } from "../hooks/useClassroomMutations";
import { classroomTypeLabels, resolveAmenityLabel } from "../model/classroomLabels";
import type { UpdateClassroomRequest } from "../model/classroomRequests";
import { weekDayLabel, weekDayLabels } from "../model/weekDay";
import type { ClassroomAvailability, ClassroomDetail } from "../model/classroomDetail";

type FailureArea = "amenity" | "availability" | "classroom";

type FormValues = {
  building: string;
  capacity: string;
  floor: string;
  name: string;
};

function dataForm(detail: ClassroomDetail): FormValues {
  return {
    building: detail.building ?? "",
    capacity: String(detail.capacity),
    floor: detail.floor === null ? "" : String(detail.floor),
    name: detail.name,
  };
}

/**
 * El `409` no distingue el motivo en el contrato, asi que cada area nombra el suyo: un aula
 * reservada, una amenidad repetida y un solape comparten codigo porque el backend los trata igual.
 * Los mensajes del backend nunca se muestran.
 */
function failureMessage(failure: ClassroomFailure | null, area: FailureArea): string | null {
  if (failure === "forbidden") return "No tiene permisos para administrar aulas.";
  if (failure === "notFound") return "Ese elemento ya no existe en el catálogo.";
  if (failure === "invalidRequest") {
    return area === "availability"
      ? "Revise el día y el rango horario: la hora final debe ser posterior a la inicial."
      : "Revise los datos ingresados e intente de nuevo.";
  }
  if (failure === "conflict") {
    if (area === "amenity") return "Esa amenidad ya está registrada en el aula.";
    if (area === "availability") {
      return "El horario se solapa con una ventana ya registrada ese día.";
    }
    return "El aula está reservada por actividades programadas o en curso.";
  }

  return failure ? "No fue posible guardar el cambio. Intente de nuevo." : null;
}

/**
 * Agrupa las ventanas por dia ISO y las ordena por hora de inicio dentro de cada dia. El dia
 * desaparece cuando no tiene ventanas, para que la agenda de la semana no anuncie siete grupos
 * vacios.
 */
function groupByWeekDay(detail: ClassroomDetail) {
  return weekDayLabels
    .map((weekDay) => ({
      ...weekDay,
      windows: detail.availability
        .filter((window) => window.dayOfWeek === weekDay.day)
        .sort((first, second) => first.startTime.localeCompare(second.startTime)),
    }))
    .filter((group) => group.windows.length > 0);
}

function describeWindow(window: ClassroomAvailability) {
  return `${weekDayLabel(window.dayOfWeek)} de ${window.startTime} a ${window.endTime}`;
}

/**
 * Detalle administrativo de un aula: datos, amenidades y disponibilidad semanal.
 *
 * El estado del aula no tiene comando propio: desactivar y reactivar son el `PATCH` de
 * `isActive`, exactamente como en las unidades, porque el contrato no publica un borrado de aulas.
 */
export function ClassroomDetailView({ classroomId }: { classroomId: string }) {
  const detailQuery = useClassroomDetail(classroomId, "administrative");
  const mutations = useClassroomMutations();
  const [form, setForm] = useState<FormValues | null>(null);
  const [amenity, setAmenity] = useState("");
  const [windowForm, setWindowForm] = useState({
    dayOfWeek: "1",
    endTime: "",
    period: "",
    startTime: "",
  });
  const classroom = detailQuery.classroom;
  const values = form ?? (classroom ? dataForm(classroom) : null);

  function updateForm(field: keyof FormValues, value: string) {
    setForm((current) => {
      const base = current ?? (classroom ? dataForm(classroom) : null);
      return base ? { ...base, [field]: value } : base;
    });
  }

  async function run(action: () => Promise<unknown>) {
    try {
      await action();
    } catch {
      // The mutation exposes the localized error inside its own section.
    }
  }

  if (!classroom && !detailQuery.isLoading) {
    if (detailQuery.failure === "notFound") {
      return (
        <ModuleShell
          description="El aula puede haberse desactivado o retirado del catalogo institucional."
          headingLabel="Gestión institucional"
          title="Aula no encontrada"
        >
          <FeedbackState
            action={
              <Button asChild colorPalette="terracotta" rounded="full">
                <RouterLink to="/admin/aulas">Volver al listado de aulas</RouterLink>
              </Button>
            }
            description="Consulte el listado para elegir otro aula."
            title="El aula solicitada ya no existe o fue retirada"
          />
        </ModuleShell>
      );
    }
  }

  return (
    <ModuleShell
      actions={
        classroom ? (
          <Button
            colorPalette={classroom.isActive ? "red" : "green"}
            loading={mutations.isPending}
            onClick={() =>
              void run(() => mutations.update(classroomId, { isActive: !classroom.isActive }))
            }
            rounded="full"
          >
            {classroom.isActive ? "Desactivar aula" : "Reactivar aula"}
          </Button>
        ) : undefined
      }
      description="Consulte y ajuste los datos, las amenidades y el horario semanal del aula."
      headingLabel="Gestión institucional"
      title={classroom?.name ?? "Aula"}
    >
      <AsyncStateView
        error={detailQuery.failure === "notFound" ? null : detailQuery.error}
        isLoading={detailQuery.isLoading}
      >
        {classroom && values ? (
          <Stack gap={8}>
            <Stack gap={4}>
              <SectionHeader title="Datos del aula" />
              {detailQuery.failure === "conflict" ||
              detailQuery.failure === "invalidRequest" ||
              mutations.classroomFailure === "conflict" ||
              mutations.classroomFailure === "invalidRequest" ? (
                <FailureText message={failureMessage(mutations.classroomFailure, "classroom")} />
              ) : null}
              <Surface padding="normal">
                <Stack
                  as="form"
                  gap={4}
                  onSubmit={(event) => {
                    event.preventDefault();
                    const request: UpdateClassroomRequest = {
                      building: values.building.trim() || null,
                      capacity: Number(values.capacity),
                      floor: values.floor.trim() ? Number(values.floor) : null,
                      name: values.name.trim(),
                      type: classroom.type,
                    };
                    void run(() => mutations.update(classroomId, request));
                  }}
                >
                  <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
                    <Field.Root required>
                      <Field.Label>Nombre</Field.Label>
                      <Input
                        maxLength={50}
                        onChange={(event) => updateForm("name", event.target.value)}
                        value={values.name}
                      />
                    </Field.Root>
                    <Field.Root required>
                      <Field.Label>Capacidad</Field.Label>
                      <Input
                        min={1}
                        onChange={(event) => updateForm("capacity", event.target.value)}
                        type="number"
                        value={values.capacity}
                      />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Tipo</Field.Label>
                      <Input
                        aria-label="Tipo"
                        disabled
                        value={classroomTypeLabels[classroom.type]}
                      />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Edificio</Field.Label>
                      <Input
                        maxLength={50}
                        onChange={(event) => updateForm("building", event.target.value)}
                        value={values.building}
                      />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Piso</Field.Label>
                      <Input
                        max={100}
                        min={-5}
                        onChange={(event) => updateForm("floor", event.target.value)}
                        type="number"
                        value={values.floor}
                      />
                    </Field.Root>
                  </SimpleGrid>
                  <HStack gap={3} justify="end" wrap="wrap">
                    <Button
                      colorPalette="terracotta"
                      disabled={mutations.isPending || !values.name.trim() || !values.capacity}
                      loading={mutations.isPending}
                      type="submit"
                    >
                      Guardar cambios
                    </Button>
                  </HStack>
                </Stack>
              </Surface>
            </Stack>

            <Stack gap={4}>
              <SectionHeader
                description="El contrato no publica un catalogo de amenidades: cada nombre se registra tal como se escribe."
                title="Amenidades"
              />
              <FailureText message={failureMessage(mutations.amenityFailure, "amenity")} />
              <Surface padding="normal">
                <Stack gap={4}>
                  {classroom.amenities.length === 0 ? (
                    <Text color="text.muted">Este aula no tiene amenidades registradas.</Text>
                  ) : (
                    <Stack gap={2} role="list">
                      {classroom.amenities.map((name) => (
                        <HStack gap={3} justify="space-between" key={name} role="listitem">
                          <Text>{resolveAmenityLabel(name)}</Text>
                          <Button
                            loading={mutations.isPending}
                            onClick={() =>
                              void run(() => mutations.removeAmenity(classroomId, name))
                            }
                            size="sm"
                            variant="outline"
                          >
                            Quitar {resolveAmenityLabel(name)}
                          </Button>
                        </HStack>
                      ))}
                    </Stack>
                  )}
                  <HStack align="end" gap={3} wrap="wrap">
                    <Field.Root maxW="16rem">
                      <Field.Label>Nueva amenidad</Field.Label>
                      <Input
                        onChange={(event) => setAmenity(event.target.value)}
                        placeholder="proyector"
                        value={amenity}
                      />
                    </Field.Root>
                    <Button
                      colorPalette="terracotta"
                      disabled={mutations.isPending || !amenity.trim()}
                      loading={mutations.isPending}
                      onClick={() =>
                        void run(async () => {
                          await mutations.addAmenity(classroomId, amenity.trim());
                          setAmenity("");
                        })
                      }
                      variant="outline"
                    >
                      Agregar amenidad
                    </Button>
                  </HStack>
                </Stack>
              </Surface>
            </Stack>

            <Stack gap={4}>
              <SectionHeader
                description="Ventanas semanales sin solaparse. El periodo es informativo y no define la disponibilidad."
                title="Disponibilidad semanal"
              />
              <FailureText
                message={failureMessage(mutations.availabilityFailure, "availability")}
              />
              <Surface
                aria-label="Disponibilidad semanal"
                as="section"
                padding="normal"
                role="region"
              >
                <Stack gap={5}>
                  {groupByWeekDay(classroom).length === 0 ? (
                    <Text color="text.muted">
                      Este aula no tiene ventanas de disponibilidad registradas.
                    </Text>
                  ) : null}
                  {groupByWeekDay(classroom).map((group) => (
                    <Box aria-label={group.label} as="section" key={group.day} role="region">
                      <Heading as="h3" color="text.default" fontSize="lg" mb={2}>
                        {group.label}
                      </Heading>
                      <Stack gap={2} role="list">
                        {group.windows.map((window) => (
                          <HStack gap={3} justify="space-between" key={window.id} role="listitem">
                            <Text>
                              {window.startTime} a {window.endTime}
                              {window.period ? ` · ${window.period}` : ""}
                            </Text>
                            <Button
                              aria-label={`Quitar ventana ${describeWindow(window)}`}
                              loading={mutations.isPending}
                              onClick={() =>
                                void run(() => mutations.removeAvailability(classroomId, window.id))
                              }
                              size="sm"
                              variant="outline"
                            >
                              Quitar
                            </Button>
                          </HStack>
                        ))}
                      </Stack>
                    </Box>
                  ))}
                  <SimpleGrid columns={{ base: 1, md: 4 }} gap={4}>
                    <Field.Root>
                      <Field.Label>Dia</Field.Label>
                      <NativeSelect.Root>
                        <NativeSelect.Field
                          onChange={(event) =>
                            setWindowForm((current) => ({
                              ...current,
                              dayOfWeek: event.target.value,
                            }))
                          }
                          value={windowForm.dayOfWeek}
                        >
                          {weekDayLabels.map((weekDay) => (
                            <option key={weekDay.day} value={weekDay.day}>
                              {weekDay.label}
                            </option>
                          ))}
                        </NativeSelect.Field>
                      </NativeSelect.Root>
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Hora de inicio</Field.Label>
                      <Input
                        maxLength={5}
                        onChange={(event) =>
                          setWindowForm((current) => ({
                            ...current,
                            startTime: event.target.value,
                          }))
                        }
                        pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
                        placeholder="08:00"
                        value={windowForm.startTime}
                      />
                      <Field.HelperText>Formato HH:mm.</Field.HelperText>
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Hora de fin</Field.Label>
                      <Input
                        maxLength={5}
                        onChange={(event) =>
                          setWindowForm((current) => ({
                            ...current,
                            endTime: event.target.value,
                          }))
                        }
                        pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
                        placeholder="10:00"
                        value={windowForm.endTime}
                      />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Periodo</Field.Label>
                      <Input
                        maxLength={30}
                        onChange={(event) =>
                          setWindowForm((current) => ({
                            ...current,
                            period: event.target.value,
                          }))
                        }
                        placeholder="Manana"
                        value={windowForm.period}
                      />
                    </Field.Root>
                  </SimpleGrid>
                  <HStack justify="end">
                    <Button
                      colorPalette="terracotta"
                      disabled={mutations.isPending || !windowForm.startTime || !windowForm.endTime}
                      loading={mutations.isPending}
                      onClick={() =>
                        void run(async () => {
                          await mutations.addAvailability(classroomId, {
                            dayOfWeek: Number(windowForm.dayOfWeek),
                            endTime: windowForm.endTime,
                            period: windowForm.period.trim() || null,
                            startTime: windowForm.startTime,
                          });
                          setWindowForm((current) => ({
                            ...current,
                            endTime: "",
                            period: "",
                            startTime: "",
                          }));
                        })
                      }
                      variant="outline"
                    >
                      Agregar ventana
                    </Button>
                  </HStack>
                </Stack>
              </Surface>
            </Stack>
          </Stack>
        ) : null}
      </AsyncStateView>
    </ModuleShell>
  );
}

function FailureText({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <Text color="fg.error" role="alert">
      {message}
    </Text>
  );
}
