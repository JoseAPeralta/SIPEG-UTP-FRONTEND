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
import { Link as RouterLink } from "react-router";

import { AsyncStateView, ModuleShell, Surface } from "@/components";
import type { OrganizationalUnitType } from "@/types/domain";

import { useOrganizationalUnitMutations } from "../hooks/useOrganizationalUnitMutations";
import { useOrganizationalUnits } from "../hooks/useOrganizationalUnits";
import { organizationalUnitTypeLabels } from "../model/organizationalUnitLabels";
import type { CreateOrganizationalUnitRequest } from "../model/organizationalUnitRequests";

type FormValues = {
  code: string;
  description: string;
  name: string;
  type: OrganizationalUnitType;
};

const EMPTY_FORM: FormValues = { code: "", description: "", name: "", type: "FACULTY" };

function creationFailure(failure: ReturnType<typeof useOrganizationalUnitMutations>["failure"]) {
  if (failure === "conflict") return "Ya existe una unidad con ese código.";
  if (failure === "forbidden") return "No tiene permisos para administrar unidades.";
  if (failure === "invalidRequest")
    return "Revise los datos: el código solo admite letras, números y guiones.";
  return failure ? "No fue posible guardar la unidad. Intente de nuevo." : null;
}

/** Listado administrativo de unidades organizativas con alta y acceso al detalle. */
export function OrganizationalUnitsView() {
  const { error, isLoading, organizationalUnits, refetch } =
    useOrganizationalUnits("administrative");
  const mutations = useOrganizationalUnitMutations();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [form, setForm] = useState<FormValues | null>(null);
  const formError = creationFailure(mutations.failure);
  const units = (organizationalUnits ?? []).filter((unit) => {
    const matchesQuery = `${unit.name} ${unit.code}`
      .toLowerCase()
      .includes(query.trim().toLowerCase());
    const matchesStatus = status === "all" || (status === "active") === unit.isActive;
    return matchesQuery && matchesStatus;
  });

  function updateForm(field: keyof FormValues, value: string) {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  }

  async function submitUnit() {
    if (!form) return;
    const request: CreateOrganizationalUnitRequest = {
      code: form.code.trim(),
      description: form.description.trim() || null,
      name: form.name.trim(),
      type: form.type,
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
          Nueva unidad
        </Button>
      }
      description="Mantenga las referencias institucionales que usan el registro y la planificación académica. Cada unidad nace con un programa predeterminado."
      headingLabel="Gestión institucional"
      title="Unidades organizativas"
    >
      <Stack gap={6}>
        <Surface padding="normal">
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            <Field.Root>
              <Field.Label>Buscar unidades</Field.Label>
              <Input
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nombre o código"
                value={query}
              />
            </Field.Root>
            <Field.Root>
              <Field.Label>Estado</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field
                  onChange={(event) => setStatus(event.target.value)}
                  value={status}
                >
                  <option value="all">Todas</option>
                  <option value="active">Activas</option>
                  <option value="inactive">Inactivas</option>
                </NativeSelect.Field>
              </NativeSelect.Root>
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
                void submitUnit();
              }}
            >
              <Text fontFamily="heading" fontSize="lg" fontWeight="700">
                Nueva unidad
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <Field.Root required>
                  <Field.Label>Nombre</Field.Label>
                  <Input
                    maxLength={150}
                    onChange={(event) => updateForm("name", event.target.value)}
                    value={form.name}
                  />
                </Field.Root>
                <Field.Root required>
                  <Field.Label>Código</Field.Label>
                  <Input
                    maxLength={20}
                    onChange={(event) => updateForm("code", event.target.value)}
                    value={form.code}
                  />
                  <Field.HelperText>Letras, números y guiones.</Field.HelperText>
                </Field.Root>
                <Field.Root required>
                  <Field.Label>Tipo</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      onChange={(event) => updateForm("type", event.target.value)}
                      value={form.type}
                    >
                      <option value="FACULTY">Facultad</option>
                      <option value="SUBDIRECTORATE">Subdirección</option>
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>
              </SimpleGrid>
              <Field.Root>
                <Field.Label>Descripción</Field.Label>
                <Textarea
                  maxLength={2000}
                  onChange={(event) => updateForm("description", event.target.value)}
                  value={form.description}
                />
              </Field.Root>
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
                  disabled={mutations.isPending || !form.name.trim() || !form.code.trim()}
                  loading={mutations.isPending}
                  type="submit"
                >
                  Guardar unidad
                </Button>
              </HStack>
            </Stack>
          </Surface>
        ) : null}
        <AsyncStateView error={error} isLoading={isLoading} onRetry={() => void refetch()}>
          {units.length === 0 ? (
            <Surface padding="normal">
              <Text color="text.muted">No hay unidades que coincidan con los filtros.</Text>
            </Surface>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              {units.map((unit) => (
                <Surface key={unit.id} padding="normal">
                  <Stack gap={3}>
                    <HStack justify="space-between" wrap="wrap">
                      <Badge colorPalette={unit.isActive ? "green" : "gray"} rounded="full">
                        {unit.isActive ? "Activa" : "Inactiva"}
                      </Badge>
                      <Text color="text.muted" fontSize="sm" fontWeight="700">
                        {unit.code}
                      </Text>
                    </HStack>
                    <Stack gap={1}>
                      <Text
                        color="text.default"
                        fontFamily="heading"
                        fontSize="xl"
                        fontWeight="700"
                      >
                        {unit.name}
                      </Text>
                      <Text color="text.muted">{organizationalUnitTypeLabels[unit.type]}</Text>
                    </Stack>
                    <Button asChild colorPalette="terracotta" rounded="full" variant="outline">
                      <RouterLink to={`/admin/unidades/${unit.id}`}>
                        Ver detalle de {unit.name}
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
