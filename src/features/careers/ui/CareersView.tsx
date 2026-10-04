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
  Textarea,
} from "@chakra-ui/react";
import { useState } from "react";

import { AsyncStateView, ModuleShell, Surface } from "@/components";
import { useOrganizationalUnits } from "@/features/organizational-units";
import type { Career } from "@/types/domain";

import { useCareerMutations } from "../hooks/useCareerMutations";
import { useCareers } from "../hooks/useCareers";
import type { CreateCareerRequest } from "../model/careerRequests";

type FormValues = {
  code: string;
  description: string;
  name: string;
  unitId: string;
};

const EMPTY_FORM: FormValues = { code: "", description: "", name: "", unitId: "global" };

function formValues(career: Career): FormValues {
  return {
    code: career.code,
    description: career.description ?? "",
    name: career.name,
    unitId: career.unitId ?? "global",
  };
}

function failureMessage(failure: ReturnType<typeof useCareerMutations>["failure"]) {
  if (failure === "invalidUnit")
    return "La unidad seleccionada ya no admite carreras. Elija una facultad activa.";
  if (failure === "conflict")
    return "El código ya está registrado o la carrera aún tiene usuarios asociados.";
  if (failure === "forbidden") return "No tiene permisos para administrar carreras.";
  return failure ? "No fue posible guardar la carrera. Intente de nuevo." : null;
}

/** Administrative management of institutional and global careers. */
export function CareersView() {
  const careersQuery = useCareers("administrative");
  const unitsQuery = useOrganizationalUnits("administrative");
  const mutations = useCareerMutations();
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState<FormValues | null>(null);
  const [editingCareer, setEditingCareer] = useState<Career | null>(null);
  const [careerToDelete, setCareerToDelete] = useState<Career | null>(null);
  const error = careersQuery.error ?? unitsQuery.error;
  const isLoading = careersQuery.isLoading || unitsQuery.isLoading;
  const careers = (careersQuery.careers ?? []).filter((career) =>
    `${career.name} ${career.code}`.toLowerCase().includes(filter.trim().toLowerCase()),
  );
  const faculties = (unitsQuery.organizationalUnits ?? []).filter(
    (unit) => unit.isActive && unit.type === "FACULTY",
  );
  const formError = failureMessage(mutations.failure);

  function updateForm(field: keyof FormValues, value: string) {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  }

  async function submitCareer() {
    if (!form) return;
    const request: CreateCareerRequest = {
      code: form.code.trim(),
      description: form.description.trim() || null,
      name: form.name.trim(),
      unitId: form.unitId === "global" ? null : form.unitId,
    };
    try {
      if (editingCareer) {
        await mutations.update(editingCareer.id, request);
      } else {
        await mutations.create(request);
      }
      setEditingCareer(null);
      setForm(null);
    } catch {
      // Mutations expose the localized error in the form.
    }
  }

  async function confirmDelete() {
    if (!careerToDelete) return;
    try {
      await mutations.delete(careerToDelete.id);
      setCareerToDelete(null);
    } catch {
      // Mutations expose the localized error next to the confirmation.
    }
  }

  return (
    <ModuleShell
      actions={
        <Button
          colorPalette="terracotta"
          onClick={() => {
            setEditingCareer(null);
            setForm(EMPTY_FORM);
          }}
          rounded="full"
        >
          Nueva carrera
        </Button>
      }
      description="Administre las carreras de cada facultad y la opción global disponible para el registro."
      headingLabel="Gestión institucional"
      title="Carreras"
    >
      <Stack gap={6}>
        <Surface padding="normal">
          <Field.Root>
            <Field.Label>Buscar carreras</Field.Label>
            <Input
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Nombre o código"
              value={filter}
            />
          </Field.Root>
        </Surface>
        {form ? (
          <Surface padding="normal">
            <Stack
              as="form"
              gap={4}
              onSubmit={(event) => {
                event.preventDefault();
                void submitCareer();
              }}
            >
              <Text fontFamily="heading" fontSize="lg" fontWeight="700">
                {editingCareer ? `Editar ${editingCareer.name}` : "Nueva carrera"}
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <Field.Root required>
                  <Field.Label>Nombre</Field.Label>
                  <Input
                    onChange={(event) => updateForm("name", event.target.value)}
                    value={form.name}
                  />
                </Field.Root>
                <Field.Root required>
                  <Field.Label>Código</Field.Label>
                  <Input
                    disabled={editingCareer?.code === "OTROS"}
                    onChange={(event) => updateForm("code", event.target.value)}
                    value={form.code}
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Unidad</Field.Label>
                  {editingCareer?.code === "OTROS" ? (
                    <Input aria-label="Unidad" disabled value="Global" />
                  ) : (
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        onChange={(event) => updateForm("unitId", event.target.value)}
                        value={form.unitId}
                      >
                        <option value="global">Global</option>
                        {faculties.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.name}
                          </option>
                        ))}
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                  )}
                </Field.Root>
                <Field.Root>
                  <Field.Label>Descripción</Field.Label>
                  <Textarea
                    onChange={(event) => updateForm("description", event.target.value)}
                    value={form.description}
                  />
                </Field.Root>
              </SimpleGrid>
              {formError ? (
                <Text color="fg.error" role="alert">
                  {formError}
                </Text>
              ) : null}
              <HStack gap={3} justify="end" wrap="wrap">
                <Button
                  onClick={() => {
                    setEditingCareer(null);
                    setForm(null);
                  }}
                  type="button"
                  variant="outline"
                >
                  Cancelar
                </Button>
                <Button
                  colorPalette="terracotta"
                  disabled={mutations.isPending || !form.name.trim() || !form.code.trim()}
                  loading={mutations.isPending}
                  type="submit"
                >
                  Guardar carrera
                </Button>
              </HStack>
            </Stack>
          </Surface>
        ) : null}
        <AsyncStateView
          error={error}
          isLoading={isLoading}
          onRetry={() => void Promise.all([careersQuery.refetch(), unitsQuery.refetch()])}
        >
          {careers.length === 0 ? (
            <Surface padding="normal">
              <Text color="text.muted">No hay carreras que coincidan con la búsqueda.</Text>
            </Surface>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              {careers.map((career) => {
                const isOthers = career.code === "OTROS";
                return (
                  <Surface key={career.id} padding="normal">
                    <Stack gap={3}>
                      <HStack justify="space-between" wrap="wrap">
                        <Badge colorPalette={career.unitId ? "blue" : "gray"} rounded="full">
                          {career.unitId ? "Facultad" : "Global"}
                        </Badge>
                        <Text color="text.muted" fontSize="sm" fontWeight="700">
                          {career.code}
                        </Text>
                      </HStack>
                      <Stack gap={1}>
                        <Text
                          color="text.default"
                          fontFamily="heading"
                          fontSize="xl"
                          fontWeight="700"
                        >
                          {career.name}
                        </Text>
                        {career.description ? (
                          <Text color="text.muted">{career.description}</Text>
                        ) : null}
                      </Stack>
                      <HStack gap={3} wrap="wrap">
                        <Button
                          onClick={() => {
                            setEditingCareer(career);
                            setForm(formValues(career));
                          }}
                          variant="outline"
                        >
                          Editar {career.name}
                        </Button>
                        <Button
                          colorPalette="red"
                          disabled={isOthers}
                          onClick={() => setCareerToDelete(career)}
                          variant="outline"
                        >
                          Eliminar {career.name}
                        </Button>
                      </HStack>
                    </Stack>
                  </Surface>
                );
              })}
            </SimpleGrid>
          )}
        </AsyncStateView>
        {careerToDelete ? (
          <Surface padding="normal">
            <Stack gap={3} role="alert">
              <Text fontWeight="700">Eliminar {careerToDelete.name}</Text>
              <Text color="text.muted">Esta acción no se puede deshacer.</Text>
              {formError ? <Text color="fg.error">{formError}</Text> : null}
              <HStack gap={3} wrap="wrap">
                <Button onClick={() => setCareerToDelete(null)} variant="outline">
                  Cancelar
                </Button>
                <Button
                  colorPalette="red"
                  loading={mutations.isPending}
                  onClick={() => void confirmDelete()}
                >
                  Confirmar eliminación de {careerToDelete.name}
                </Button>
              </HStack>
            </Stack>
          </Surface>
        ) : null}
      </Stack>
    </ModuleShell>
  );
}
