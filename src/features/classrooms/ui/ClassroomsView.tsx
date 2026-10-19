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
import { useState } from "react";
import { Link as RouterLink } from "react-router";

import { AsyncStateView, FeedbackState, ModuleShell, Surface } from "@/components";

import { useClassroomMutations } from "../hooks/useClassroomMutations";
import { useClassroomsOverview } from "../hooks/useClassroomsOverview";
import { classroomTypeLabels, resolveAmenityLabel } from "../model/classroomLabels";
import type { CreateClassroomRequest } from "../model/classroomRequests";
import type { ClassroomType } from "@/types/domain";

type StatusFilter = "all" | "active" | "inactive";

type FormValues = {
  building: string;
  capacity: string;
  floor: string;
  name: string;
};

const EMPTY_FORM: FormValues = { building: "", capacity: "", floor: "", name: "" };

function creationFailure(failure: ReturnType<typeof useClassroomMutations>["failure"]) {
  if (failure === "forbidden") return "No tiene permisos para administrar aulas.";
  if (failure === "invalidRequest") return "Revise los datos ingresados e intente de nuevo.";
  return failure ? "No fue posible guardar el aula. Intente de nuevo." : null;
}

/**
 * Listado administrativo de aulas.
 *
 * El filtro de estado arranca en "todas" porque el backend solo devuelve aulas activas cuando se
 * omite `isActive`: una administracion que no puede listar las inactivas no puede reactivarlas.
 * La busqueda por nombre es local y los demas filtros viajan al adapter, que es quien los traducir
 * a los parametros del contrato.
 */
export function ClassroomsView() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [type, setType] = useState<"" | ClassroomType>("");
  const [minCapacity, setMinCapacity] = useState("");
  const [amenity, setAmenity] = useState("");
  const [form, setForm] = useState<FormValues | null>(null);
  const classroomsQuery = useClassroomsOverview({
    ...(amenity.trim() ? { amenity: amenity.trim() } : {}),
    isActive: status,
    ...(minCapacity ? { minCapacity: Number(minCapacity) } : {}),
    ...(type ? { type } : {}),
  });
  const mutations = useClassroomMutations();
  const formError = creationFailure(mutations.failure);
  const classrooms = classroomsQuery.classrooms.filter((classroom) =>
    `${classroom.name} ${classroom.building ?? ""}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  function updateForm(field: keyof FormValues, value: string) {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  }

  async function submitClassroom() {
    if (!form) return;
    const request: CreateClassroomRequest = {
      building: form.building.trim() || null,
      capacity: Number(form.capacity),
      floor: form.floor.trim() ? Number(form.floor) : null,
      name: form.name.trim(),
      type: "CLASSROOM",
    };

    try {
      await mutations.create(request);
      setForm(null);
    } catch {
      // The mutation exposes the localized error inside the form.
    }
  }

  return (
    <ModuleShell
      actions={
        <Button colorPalette="terracotta" onClick={() => setForm(EMPTY_FORM)} rounded="full">
          Nueva aula
        </Button>
      }
      description="Administre las aulas y laboratorios que usa la planificacion de actividades."
      headingLabel="Gestión institucional"
      title="Aulas"
    >
      <Stack gap={6}>
        <Surface padding="normal">
          <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
            <Field.Root>
              <Field.Label>Buscar aulas</Field.Label>
              <Input
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nombre o edificio"
                value={search}
              />
            </Field.Root>
            <Field.Root>
              <Field.Label>Tipo</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field
                  onChange={(event) => setType(event.target.value as ClassroomType | "")}
                  value={type}
                >
                  <option value="">Todos</option>
                  <option value="CLASSROOM">Aula</option>
                  <option value="LABORATORY">Laboratorio</option>
                  <option value="CONFERENCE_ROOM">Sala de conferencias</option>
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Field.Root>
            <Field.Root>
              <Field.Label>Estado</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field
                  onChange={(event) => setStatus(event.target.value as StatusFilter)}
                  value={status}
                >
                  <option value="all">Todas</option>
                  <option value="active">Activas</option>
                  <option value="inactive">Inactivas</option>
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Field.Root>
            <Field.Root>
              <Field.Label>Capacidad minima</Field.Label>
              <Input
                min={1}
                onChange={(event) => setMinCapacity(event.target.value)}
                type="number"
                value={minCapacity}
              />
            </Field.Root>
            <Field.Root>
              <Field.Label>Amenidad</Field.Label>
              <Input
                onChange={(event) => setAmenity(event.target.value)}
                placeholder="proyector"
                value={amenity}
              />
            </Field.Root>
          </SimpleGrid>
        </Surface>
        {form ? (
          <Surface padding="normal">
            <Stack
              as="form"
              gap={4}
              onSubmit={(event) => {
                event.preventDefault();
                void submitClassroom();
              }}
            >
              <Text fontFamily="heading" fontSize="lg" fontWeight="700">
                Nueva aula
              </Text>
              <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
                <Field.Root required>
                  <Field.Label>Nombre</Field.Label>
                  <Input
                    maxLength={50}
                    onChange={(event) => updateForm("name", event.target.value)}
                    value={form.name}
                  />
                </Field.Root>
                <Field.Root required>
                  <Field.Label>Capacidad</Field.Label>
                  <Input
                    min={1}
                    onChange={(event) => updateForm("capacity", event.target.value)}
                    type="number"
                    value={form.capacity}
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Edificio</Field.Label>
                  <Input
                    maxLength={50}
                    onChange={(event) => updateForm("building", event.target.value)}
                    value={form.building}
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Piso</Field.Label>
                  <Input
                    max={100}
                    min={-5}
                    onChange={(event) => updateForm("floor", event.target.value)}
                    type="number"
                    value={form.floor}
                  />
                </Field.Root>
              </SimpleGrid>
              {formError ? (
                <Text color="fg.error" role="alert">
                  {formError}
                </Text>
              ) : null}
              <HStack gap={3} justify="end" wrap="wrap">
                <Button onClick={() => setForm(null)} type="button" variant="outline">
                  Cancelar
                </Button>
                <Button
                  colorPalette="terracotta"
                  disabled={mutations.isPending || !form.name.trim() || !form.capacity}
                  loading={mutations.isPending}
                  type="submit"
                >
                  Guardar aula
                </Button>
              </HStack>
            </Stack>
          </Surface>
        ) : null}
        <AsyncStateView error={classroomsQuery.error} isLoading={classroomsQuery.isLoading}>
          {classrooms.length === 0 ? (
            <FeedbackState
              description="Ajuste la busqueda o los filtros para consultar otras aulas."
              title="No hay aulas que coincidan con los filtros"
            />
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
              {classrooms.map((classroom) => (
                <Surface key={classroom.id} padding="normal">
                  <Stack gap={3}>
                    <HStack justify="space-between" wrap="wrap">
                      <Badge colorPalette={classroom.isActive ? "green" : "gray"} rounded="full">
                        {classroom.isActive ? "Activa" : "Inactiva"}
                      </Badge>
                      <Badge
                        colorPalette={classroom.type === "LABORATORY" ? "terracotta" : "gray"}
                        rounded="full"
                      >
                        {classroomTypeLabels[classroom.type]}
                      </Badge>
                    </HStack>
                    <Stack gap={1}>
                      <Text
                        color="text.default"
                        fontFamily="heading"
                        fontSize="xl"
                        fontWeight="700"
                      >
                        {classroom.name}
                      </Text>
                      <Text color="text.muted">
                        {[
                          classroom.building,
                          classroom.floor === null ? null : `Piso ${classroom.floor}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    </Stack>
                    <Text color="accent.solid" fontWeight="900">
                      {classroom.capacity} pax
                    </Text>
                    <HStack gap={2} wrap="wrap">
                      {classroom.amenities.map((amenity) => (
                        <Badge key={amenity} rounded="full" variant="surface">
                          {resolveAmenityLabel(amenity)}
                        </Badge>
                      ))}
                    </HStack>
                    <Button asChild colorPalette="terracotta" rounded="full" variant="outline">
                      <RouterLink to={`/admin/aulas/${classroom.id}`}>
                        Ver detalle de {classroom.name}
                      </RouterLink>
                    </Button>
                  </Stack>
                </Surface>
              ))}
            </SimpleGrid>
          )}
        </AsyncStateView>
      </Stack>
    </ModuleShell>
  );
}
