import {
  Badge,
  Button,
  Field,
  HStack,
  Input,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useState } from "react";
import { Link as RouterLink } from "react-router";

import { AsyncStateView, FeedbackState, ModuleShell, SectionHeader, Surface } from "@/components";

import type { OrganizationalUnitFailure } from "../adapters/organizationalUnitFailure";
import { useOrganizationalUnitDetail } from "../hooks/useOrganizationalUnitDetail";
import { useOrganizationalUnitMutations } from "../hooks/useOrganizationalUnitMutations";
import {
  defaultProgramStatusLabels,
  organizationalUnitTypeLabels,
} from "../model/organizationalUnitLabels";
import type { UpdateOrganizationalUnitRequest } from "../model/organizationalUnitRequests";

type FormValues = { description: string; name: string };
type ActionKind = "lifecycle" | "update";

function dataForm(name: string, description: string | null): FormValues {
  return { description: description ?? "", name };
}

function failureMessage(failure: OrganizationalUnitFailure | null, kind: ActionKind) {
  if (failure === "conflict" && kind === "lifecycle") {
    return "La unidad tiene un programa predeterminado con actividades programadas o en curso. Cierre o reprograme esas actividades antes de desactivarla.";
  }
  if (failure === "forbidden") return "No tiene permisos para administrar unidades.";
  if (failure === "notFound") return "La unidad ya no existe en el catálogo.";
  if (failure === "invalidRequest") return "Revise los datos ingresados e intente de nuevo.";
  return failure ? "No fue posible completar la operación. Intente de nuevo." : null;
}

/**
 * Detalle administrativo de una unidad: datos, programa predeterminado y carreras.
 *
 * La unidad no se elimina: el ciclo de vida se cierra con `deactivate`/`reactivate`, y la
 * desactivación se rechaza mientras el programa predeterminado tenga actividades programadas o en
 * curso. Ese conflicto ofrece reintento en lugar de un callejón sin salida.
 */
export function OrganizationalUnitDetailView({ unitId }: { unitId: string }) {
  const detailQuery = useOrganizationalUnitDetail(unitId, "administrative");
  const mutations = useOrganizationalUnitMutations();
  const [form, setForm] = useState<FormValues | null>(null);
  const [retry, setRetry] = useState<{ action: () => Promise<unknown>; kind: ActionKind } | null>(
    null,
  );
  const unit = detailQuery.organizationalUnit;
  const values = form ?? dataForm(unit?.name ?? "", unit?.description ?? null);
  const message = retry ? failureMessage(mutations.failure, retry.kind) : null;

  function updateForm(field: keyof FormValues, value: string) {
    setForm((current) => {
      const base = current ?? dataForm(unit?.name ?? "", unit?.description ?? null);
      return { ...base, [field]: value };
    });
  }

  async function run(action: () => Promise<unknown>, kind: ActionKind) {
    setRetry(null);
    try {
      await action();
    } catch {
      setRetry({ action, kind });
    }
  }

  function submitUnit() {
    if (!unit) return;
    const request: UpdateOrganizationalUnitRequest = {
      description: values.description.trim() || null,
      name: values.name.trim(),
    };
    void run(async () => {
      await mutations.update(unitId, request);
      setForm(null);
    }, "update");
  }

  if (!unit && !detailQuery.isLoading && detailQuery.failure === "notFound") {
    return (
      <ModuleShell
        description="La unidad puede haberse retirado del catálogo institucional."
        headingLabel="Gestión institucional"
        title="Unidad no encontrada"
      >
        <FeedbackState
          action={
            <Button asChild colorPalette="terracotta" rounded="full">
              <RouterLink to="/admin/unidades">Volver al listado de unidades</RouterLink>
            </Button>
          }
          description="Consulte el listado para elegir otra unidad."
          title="La unidad solicitada ya no existe"
        />
      </ModuleShell>
    );
  }

  return (
    <ModuleShell
      actions={
        unit ? (
          <Button
            colorPalette={unit.isActive ? "red" : "green"}
            loading={mutations.isPending}
            onClick={() =>
              void run(
                () => (unit.isActive ? mutations.deactivate(unitId) : mutations.reactivate(unitId)),
                "lifecycle",
              )
            }
            rounded="full"
          >
            {unit.isActive ? "Desactivar unidad" : "Reactivar unidad"}
          </Button>
        ) : undefined
      }
      description="Consulte y ajuste los datos de la unidad, su programa predeterminado y sus carreras."
      headingLabel="Gestión institucional"
      title={unit?.name ?? "Unidad organizativa"}
    >
      <AsyncStateView
        error={detailQuery.failure === "notFound" ? null : detailQuery.error}
        isLoading={detailQuery.isLoading}
      >
        {unit ? (
          <Stack gap={8}>
            {message && retry ? (
              <Surface padding="normal">
                <Stack gap={3} role="alert">
                  <Text color="fg.error">{message}</Text>
                  <HStack gap={3} wrap="wrap">
                    <Button
                      onClick={() => {
                        const { action, kind } = retry;
                        mutations.reset();
                        void run(action, kind);
                      }}
                      variant="outline"
                    >
                      Reintentar
                    </Button>
                  </HStack>
                </Stack>
              </Surface>
            ) : null}

            <Stack gap={4}>
              <SectionHeader title="Datos de la unidad" />
              <Surface padding="normal">
                <Stack
                  as="form"
                  gap={4}
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitUnit();
                  }}
                >
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                    <Field.Root required>
                      <Field.Label>Nombre</Field.Label>
                      <Input
                        maxLength={150}
                        onChange={(event) => updateForm("name", event.target.value)}
                        value={values.name}
                      />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Código</Field.Label>
                      <Input aria-label="Código" disabled value={unit.code} />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Tipo</Field.Label>
                      <Input
                        aria-label="Tipo"
                        disabled
                        value={organizationalUnitTypeLabels[unit.type]}
                      />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Responsable</Field.Label>
                      <Input
                        aria-label="Responsable"
                        disabled
                        value={
                          unit.head
                            ? `${unit.head.firstName} ${unit.head.lastName}`
                            : "Sin responsable asignado"
                        }
                      />
                    </Field.Root>
                  </SimpleGrid>
                  <Field.Root>
                    <Field.Label>Descripción</Field.Label>
                    <Textarea
                      maxLength={2000}
                      onChange={(event) => updateForm("description", event.target.value)}
                      value={values.description}
                    />
                  </Field.Root>
                  <HStack gap={3} justify="end" wrap="wrap">
                    <Button
                      colorPalette="terracotta"
                      disabled={mutations.isPending || !values.name.trim()}
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
                description="Cada unidad nace con un programa predeterminado. La unidad no puede desactivarse mientras ese programa tenga actividades programadas o en curso."
                title="Programa predeterminado"
              />
              <Surface padding="normal">
                {unit.defaultProgram ? (
                  <HStack justify="space-between" wrap="wrap">
                    <Text fontWeight="700">{unit.defaultProgram.name}</Text>
                    <Badge
                      colorPalette={unit.defaultProgram.status === "ACTIVE" ? "green" : "gray"}
                      rounded="full"
                    >
                      {defaultProgramStatusLabels[unit.defaultProgram.status]}
                    </Badge>
                  </HStack>
                ) : (
                  <Text color="text.muted">Esta unidad no tiene un programa predeterminado.</Text>
                )}
              </Surface>
            </Stack>

            <Stack gap={4}>
              <SectionHeader title="Carreras asociadas" />
              <Surface padding="normal">
                {unit.careers.length === 0 ? (
                  <Text color="text.muted">Esta unidad no tiene carreras registradas.</Text>
                ) : (
                  <Stack gap={2} role="list">
                    {unit.careers.map((career) => (
                      <HStack gap={3} justify="space-between" key={career.id} role="listitem">
                        <Text>{career.name}</Text>
                        <Text color="text.muted" fontSize="sm" fontWeight="700">
                          {career.code}
                        </Text>
                      </HStack>
                    ))}
                  </Stack>
                )}
              </Surface>
            </Stack>
          </Stack>
        ) : null}
      </AsyncStateView>
    </ModuleShell>
  );
}
