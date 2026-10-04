import {
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

import { AsyncStateView, FeedbackState, ModuleShell, SectionHeader, Surface } from "@/components";
import { useCareers } from "@/features/careers";
import { useOrganizationalUnits } from "@/features/organizational-units";
import type { GlobalRole } from "@/types/domain";

import { useUserDetail } from "../hooks/useUserDetail";
import { useUserMutations } from "../hooks/useUserMutations";
import type { AdminUser } from "../model/adminUser";
import { globalRoleLabels } from "../model/userLabels";
import type { UpdateAdminUserRequest } from "../model/userRequests";

type FormValues = { careerId: string; globalRole: GlobalRole; unitId: string };
type ActionKind = "lifecycle" | "profile";

function userValues(user: AdminUser | null): FormValues {
  return {
    careerId: user?.career?.id ?? "",
    globalRole: user?.globalRole ?? "USER",
    unitId: user?.unit?.id ?? "",
  };
}

function failureMessage(kind: ActionKind, failure: ReturnType<typeof useUserMutations>["failure"]) {
  if (!failure) return null;
  if (failure === "forbidden") return "No tiene permisos para administrar usuarios.";
  if (failure === "notFound") return "La cuenta ya no existe.";
  if (kind === "lifecycle" && failure === "conflict") {
    return "No puede desactivar su propia cuenta ni dejar la plataforma sin administradores activos.";
  }
  if (kind === "profile" && failure === "conflict") {
    return "No fue posible guardar los cambios. Una cuenta inactiva no puede promoverse y la promoción no se combina con la desactivación.";
  }
  if (failure === "invalidRequest") return "Revise la unidad y la carrera seleccionadas.";
  return "No fue posible completar la operación. Intente de nuevo.";
}

/**
 * Detalle administrativo de una cuenta.
 *
 * La identidad (nombre, correo, cedula) se muestra en solo lectura porque el contrato no la edita.
 * El unico cambio de estado destructivo es la desactivacion, que revoca las sesiones y exige
 * confirmacion explicita. El backend es la autoridad final de las salvaguardas.
 */
export function UserDetailView({ userId }: { userId: string }) {
  const detailQuery = useUserDetail(userId);
  const unitsQuery = useOrganizationalUnits("administrative");
  const careersQuery = useCareers("administrative");
  const mutations = useUserMutations();
  const [form, setForm] = useState<FormValues | null>(null);
  const [action, setAction] = useState<ActionKind | null>(null);
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);
  const user = detailQuery.user;
  const values = form ?? userValues(user);
  const message = failureMessage(action ?? "profile", mutations.failure);

  const units = (unitsQuery.organizationalUnits ?? []).filter((unit) => unit.isActive);
  const hasCurrentUnit = user?.unit ? units.some((unit) => unit.id === user.unit?.id) : true;
  const unitOptions = hasCurrentUnit || !user?.unit ? units : [user.unit, ...units];
  const formCareers = values.unitId
    ? (careersQuery.careers ?? []).filter((career) => career.unitId === values.unitId)
    : [];

  function updateForm(patch: Partial<FormValues>) {
    setForm((current) => {
      const base = current ?? userValues(user);
      return { ...base, ...patch };
    });
  }

  async function run(kind: ActionKind, operation: () => Promise<unknown>) {
    setAction(null);
    mutations.reset();
    try {
      await operation();
      if (kind === "profile") setForm(null);
      setConfirmingDeactivate(false);
    } catch {
      setAction(kind);
    }
  }

  function submitProfile() {
    if (!user) return;
    const request: UpdateAdminUserRequest = {};
    const nextUnitId = values.unitId || null;

    if (values.globalRole !== user.globalRole) request.globalRole = values.globalRole;
    if (nextUnitId !== (user.unit?.id ?? null)) request.unitId = nextUnitId;
    if (values.unitId && values.careerId && values.careerId !== (user.career?.id ?? "")) {
      request.careerId = values.careerId;
    }

    if (Object.keys(request).length === 0) return;

    void run("profile", () => mutations.update(user.id, request));
  }

  if (!user && !detailQuery.isLoading && detailQuery.failure === "notFound") {
    return (
      <ModuleShell
        description="La cuenta puede haberse retirado o el enlace ya no es válido."
        headingLabel="Administración"
        title="Cuenta no encontrada"
      >
        <FeedbackState
          action={
            <Button asChild colorPalette="terracotta" rounded="full">
              <RouterLink to="/admin/usuarios">Volver al listado de usuarios</RouterLink>
            </Button>
          }
          description="Consulte el listado para elegir otra cuenta."
          title="La cuenta solicitada ya no existe"
        />
      </ModuleShell>
    );
  }

  return (
    <ModuleShell
      actions={
        user ? (
          user.isActive ? (
            <Button
              colorPalette="red"
              loading={mutations.isPending}
              onClick={() => setConfirmingDeactivate(true)}
              rounded="full"
            >
              Desactivar cuenta
            </Button>
          ) : (
            <Button
              colorPalette="green"
              loading={mutations.isPending}
              onClick={() =>
                void run("lifecycle", () => mutations.update(user.id, { isActive: true }))
              }
              rounded="full"
            >
              Reactivar cuenta
            </Button>
          )
        ) : undefined
      }
      description="Consulte la identidad de la cuenta y ajuste su rol, estado, unidad y carrera."
      headingLabel="Administración"
      title={user ? `${user.firstName} ${user.lastName}` : "Detalle de usuario"}
    >
      <AsyncStateView
        error={detailQuery.failure === "notFound" ? null : detailQuery.error}
        isLoading={detailQuery.isLoading}
      >
        {user ? (
          <Stack gap={8}>
            {message ? (
              <Surface padding="normal">
                <Text color="fg.error" role="alert">
                  {message}
                </Text>
              </Surface>
            ) : null}

            <Stack gap={4}>
              <SectionHeader title="Identidad de la cuenta" />
              <Surface padding="normal">
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                  <Field.Root>
                    <Field.Label>Nombre completo</Field.Label>
                    <Input
                      aria-label="Nombre completo"
                      disabled
                      value={`${user.firstName} ${user.lastName}`}
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Correo electrónico</Field.Label>
                    <Input aria-label="Correo electrónico" disabled value={user.email} />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Cédula</Field.Label>
                    <Input aria-label="Cédula" disabled value={user.identificationNumber} />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Estado</Field.Label>
                    <Input
                      aria-label="Estado"
                      disabled
                      value={user.isActive ? "Cuenta activa" : "Cuenta inactiva"}
                    />
                  </Field.Root>
                </SimpleGrid>
              </Surface>
            </Stack>

            <Stack gap={4}>
              <SectionHeader title="Rol y adscripción" />
              <Surface padding="normal">
                <Stack
                  as="form"
                  gap={4}
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitProfile();
                  }}
                >
                  <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
                    <Field.Root>
                      <Field.Label>Rol global</Field.Label>
                      <NativeSelect.Root>
                        <NativeSelect.Field
                          onChange={(event) =>
                            updateForm({ globalRole: event.target.value as GlobalRole })
                          }
                          value={values.globalRole}
                        >
                          <option value="USER">Usuario</option>
                          <option value="ADMIN">Administrador</option>
                        </NativeSelect.Field>
                      </NativeSelect.Root>
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Unidad</Field.Label>
                      <NativeSelect.Root>
                        <NativeSelect.Field
                          onChange={(event) =>
                            updateForm({ careerId: "", unitId: event.target.value })
                          }
                          value={values.unitId}
                        >
                          <option value="">Otros</option>
                          {unitOptions.map((unit) => (
                            <option key={unit.id} value={unit.id}>
                              {unit.name}
                            </option>
                          ))}
                        </NativeSelect.Field>
                      </NativeSelect.Root>
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Carrera</Field.Label>
                      <NativeSelect.Root disabled={!values.unitId}>
                        <NativeSelect.Field
                          onChange={(event) => updateForm({ careerId: event.target.value })}
                          value={values.unitId ? values.careerId : "otros"}
                        >
                          {values.unitId ? (
                            <>
                              <option value="">Sin carrera</option>
                              {formCareers.map((career) => (
                                <option key={career.id} value={career.id}>
                                  {career.name}
                                </option>
                              ))}
                            </>
                          ) : (
                            <option value="otros">Otros</option>
                          )}
                        </NativeSelect.Field>
                      </NativeSelect.Root>
                    </Field.Root>
                  </SimpleGrid>
                  <Text color="text.muted" fontSize="sm">
                    {`Rol actual: ${globalRoleLabels[user.globalRole]}. `}
                    {user.isActive
                      ? "La cuenta está activa."
                      : "Una cuenta inactiva no puede promoverse a administrador."}
                  </Text>
                  <HStack gap={3} justify="end" wrap="wrap">
                    <Button colorPalette="terracotta" loading={mutations.isPending} type="submit">
                      Guardar cambios
                    </Button>
                  </HStack>
                </Stack>
              </Surface>
            </Stack>

            {confirmingDeactivate ? (
              <Surface padding="normal">
                <Stack aria-label="Confirmar desactivación" gap={3} role="group">
                  <Text fontWeight="700">
                    Desactivar la cuenta de {user.firstName} {user.lastName}
                  </Text>
                  <Text color="text.muted">
                    La cuenta no podrá iniciar sesión y se revocarán sus sesiones abiertas. No puede
                    desactivar su propia cuenta ni dejar la plataforma sin administradores activos.
                  </Text>
                  <HStack gap={3} wrap="wrap">
                    <Button onClick={() => setConfirmingDeactivate(false)} variant="outline">
                      Cancelar
                    </Button>
                    <Button
                      colorPalette="red"
                      loading={mutations.isPending}
                      onClick={() =>
                        void run("lifecycle", () => mutations.update(user.id, { isActive: false }))
                      }
                    >
                      Confirmar desactivación de {user.firstName} {user.lastName}
                    </Button>
                  </HStack>
                </Stack>
              </Surface>
            ) : null}
          </Stack>
        ) : null}
      </AsyncStateView>
    </ModuleShell>
  );
}
