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

import {
  AsyncStateView,
  FeedbackState,
  ModuleShell,
  PaginationControls,
  Surface,
} from "@/components";
import { useCareers } from "@/features/careers";
import { useOrganizationalUnits } from "@/features/organizational-units";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  type RegistrationErrors,
  validateRegistrationPayload,
} from "@/features/registration";
import type { GlobalRole } from "@/types/domain";

import { useUserMutations } from "../hooks/useUserMutations";
import { useUsersPage } from "../hooks/useUsersPage";
import { globalRoleLabels } from "../model/userLabels";
import type { CreateAdminUserRequest } from "../model/userRequests";

type FiltersState = {
  careerId: string;
  globalRole: "" | GlobalRole;
  isActive: "active" | "all" | "inactive";
  unitId: string;
};

type FormValues = {
  careerId: string;
  email: string;
  firstName: string;
  identificationNumber: string;
  lastName: string;
  password: string;
  unitId: string;
};

const EMPTY_FILTERS: FiltersState = { careerId: "", globalRole: "", isActive: "all", unitId: "" };
const EMPTY_FORM: FormValues = {
  careerId: "",
  email: "",
  firstName: "",
  identificationNumber: "",
  lastName: "",
  password: "",
  unitId: "",
};

function createFailureMessage(failure: ReturnType<typeof useUserMutations>["failure"]) {
  if (failure === "conflict") return "El correo electrónico o la cédula ya están registrados.";
  if (failure === "invalidRequest") return "Revise la unidad y la carrera seleccionadas.";
  if (failure === "forbidden") return "No tiene permisos para administrar usuarios.";
  return failure ? "No fue posible crear la cuenta. Intente de nuevo." : null;
}

/** Listado administrativo de cuentas: busqueda, filtros, paginacion y alta. */
export function UsersView() {
  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<FormValues | null>(null);
  const [fieldErrors, setFieldErrors] = useState<RegistrationErrors>({});
  const [createdName, setCreatedName] = useState<string | null>(null);

  const usersQuery = useUsersPage(
    {
      ...(filters.globalRole ? { globalRole: filters.globalRole } : {}),
      ...(filters.isActive !== "all" ? { isActive: filters.isActive === "active" } : {}),
      ...(filters.unitId ? { unitId: filters.unitId } : {}),
      ...(filters.careerId ? { careerId: filters.careerId } : {}),
      ...(query ? { q: query } : {}),
    },
    page,
  );
  const unitsQuery = useOrganizationalUnits("administrative");
  const careersQuery = useCareers("administrative");
  const mutations = useUserMutations();

  const units = (unitsQuery.organizationalUnits ?? []).filter((unit) => unit.isActive);
  const careers = careersQuery.careers ?? [];
  const filteredCareers = filters.unitId
    ? careers.filter((career) => career.unitId === filters.unitId)
    : careers;
  const formCareers = form?.unitId ? careers.filter((career) => career.unitId === form.unitId) : [];
  const items = usersQuery.page?.items ?? [];
  const failureMessage = createFailureMessage(mutations.failure);

  function updateFilters(patch: Partial<FiltersState>) {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  }

  function updateForm(field: keyof FormValues, value: string) {
    setForm((current) => {
      if (!current) return current;
      if (field === "unitId") return { ...current, careerId: "", unitId: value };
      return { ...current, [field]: value };
    });
  }

  function openCreateForm() {
    mutations.reset();
    setFieldErrors({});
    setCreatedName(null);
    setForm(EMPTY_FORM);
  }

  async function submitCreate() {
    if (!form) return;
    const errors = validateRegistrationPayload({
      email: form.email,
      firstName: form.firstName,
      identificationNumber: form.identificationNumber,
      lastName: form.lastName,
      password: form.password,
    });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const request: CreateAdminUserRequest = {
      email: form.email.trim(),
      firstName: form.firstName.trim(),
      identificationNumber: form.identificationNumber.trim(),
      lastName: form.lastName.trim(),
      password: form.password,
      unitId: form.unitId || null,
      ...(form.unitId && form.careerId ? { careerId: form.careerId } : {}),
    };

    try {
      const created = await mutations.create(request);
      setCreatedName(`${created.firstName} ${created.lastName}`);
      setForm(null);
      setFieldErrors({});
      setPage(1);
    } catch {
      // La mutacion expone el fallo localizado junto al formulario.
    }
  }

  return (
    <ModuleShell
      actions={
        <Button colorPalette="terracotta" onClick={openCreateForm} rounded="full">
          Nuevo usuario
        </Button>
      }
      description="Busque y filtre cuentas, cree usuarios y ajuste rol, estado, unidad y carrera."
      headingLabel="Administración"
      title="Usuarios"
    >
      <Stack gap={6}>
        <Surface padding="normal">
          <Stack gap={4}>
            <Stack
              as="form"
              gap={4}
              onSubmit={(event) => {
                event.preventDefault();
                setQuery(search.trim());
                setPage(1);
              }}
            >
              <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} gap={4}>
                <Field.Root>
                  <Field.Label>Buscar usuarios</Field.Label>
                  <Input
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Nombre, correo o cédula"
                    value={search}
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Rol</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      onChange={(event) =>
                        updateFilters({ globalRole: event.target.value as "" | GlobalRole })
                      }
                      value={filters.globalRole}
                    >
                      <option value="">Todos</option>
                      <option value="USER">Usuario</option>
                      <option value="ADMIN">Administrador</option>
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>
                <Field.Root>
                  <Field.Label>Estado</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      onChange={(event) =>
                        updateFilters({ isActive: event.target.value as FiltersState["isActive"] })
                      }
                      value={filters.isActive}
                    >
                      <option value="all">Todas</option>
                      <option value="active">Activas</option>
                      <option value="inactive">Inactivas</option>
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>
                <Field.Root>
                  <Field.Label>Unidad</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      onChange={(event) =>
                        updateFilters({ careerId: "", unitId: event.target.value })
                      }
                      value={filters.unitId}
                    >
                      <option value="">Todas</option>
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name}
                        </option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>
                <Field.Root>
                  <Field.Label>Carrera</Field.Label>
                  <NativeSelect.Root disabled={!filters.unitId}>
                    <NativeSelect.Field
                      onChange={(event) => updateFilters({ careerId: event.target.value })}
                      value={filters.careerId}
                    >
                      <option value="">Todas</option>
                      {filteredCareers.map((career) => (
                        <option key={career.id} value={career.id}>
                          {career.name}
                        </option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>
              </SimpleGrid>
              <HStack justify="end">
                <Button rounded="full" type="submit" variant="outline">
                  Buscar
                </Button>
              </HStack>
            </Stack>
          </Stack>
        </Surface>

        {createdName ? (
          <Surface padding="normal">
            <Text color="text.default" fontWeight="700" role="status">
              Cuenta creada para {createdName}. Se envió un correo de verificación.
            </Text>
          </Surface>
        ) : null}

        {form ? (
          <Surface padding="normal">
            <Stack
              as="form"
              gap={4}
              onSubmit={(event) => {
                event.preventDefault();
                void submitCreate();
              }}
            >
              <Text fontFamily="heading" fontSize="lg" fontWeight="700">
                Nuevo usuario
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <Field.Root invalid={Boolean(fieldErrors.firstName)} required>
                  <Field.Label>Nombre</Field.Label>
                  <Input
                    maxLength={100}
                    onChange={(event) => updateForm("firstName", event.target.value)}
                    value={form.firstName}
                  />
                  <Field.ErrorText>{fieldErrors.firstName}</Field.ErrorText>
                </Field.Root>
                <Field.Root invalid={Boolean(fieldErrors.lastName)} required>
                  <Field.Label>Apellido</Field.Label>
                  <Input
                    maxLength={100}
                    onChange={(event) => updateForm("lastName", event.target.value)}
                    value={form.lastName}
                  />
                  <Field.ErrorText>{fieldErrors.lastName}</Field.ErrorText>
                </Field.Root>
                <Field.Root invalid={Boolean(fieldErrors.email)} required>
                  <Field.Label>Correo electrónico</Field.Label>
                  <Input
                    maxLength={254}
                    onChange={(event) => updateForm("email", event.target.value)}
                    type="email"
                    value={form.email}
                  />
                  <Field.ErrorText>{fieldErrors.email}</Field.ErrorText>
                </Field.Root>
                <Field.Root invalid={Boolean(fieldErrors.identificationNumber)} required>
                  <Field.Label>Cédula</Field.Label>
                  <Input
                    maxLength={30}
                    onChange={(event) => updateForm("identificationNumber", event.target.value)}
                    value={form.identificationNumber}
                  />
                  <Field.ErrorText>{fieldErrors.identificationNumber}</Field.ErrorText>
                </Field.Root>
              </SimpleGrid>
              <Field.Root invalid={Boolean(fieldErrors.password)} required>
                <Field.Label>Contraseña</Field.Label>
                <Input
                  autoComplete="new-password"
                  maxLength={PASSWORD_MAX_LENGTH}
                  onChange={(event) => updateForm("password", event.target.value)}
                  type="password"
                  value={form.password}
                />
                <Field.HelperText>
                  Debe tener entre {PASSWORD_MIN_LENGTH} y {PASSWORD_MAX_LENGTH} caracteres.
                </Field.HelperText>
                <Field.ErrorText>{fieldErrors.password}</Field.ErrorText>
              </Field.Root>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <Field.Root>
                  <Field.Label>Unidad</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      onChange={(event) => updateForm("unitId", event.target.value)}
                      value={form.unitId}
                    >
                      <option value="">Otros</option>
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name}
                        </option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>
                <Field.Root>
                  <Field.Label>Carrera</Field.Label>
                  <NativeSelect.Root disabled={!form.unitId}>
                    <NativeSelect.Field
                      onChange={(event) => updateForm("careerId", event.target.value)}
                      value={form.careerId}
                    >
                      <option value="">Sin carrera</option>
                      {formCareers.map((career) => (
                        <option key={career.id} value={career.id}>
                          {career.name}
                        </option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>
              </SimpleGrid>
              {failureMessage ? (
                <Text color="fg.error" role="alert">
                  {failureMessage}
                </Text>
              ) : null}
              <HStack gap={3} justify="end" wrap="wrap">
                <Button
                  onClick={() => {
                    setForm(null);
                    setFieldErrors({});
                  }}
                  type="button"
                  variant="outline"
                >
                  Cancelar
                </Button>
                <Button colorPalette="terracotta" loading={mutations.isPending} type="submit">
                  Guardar usuario
                </Button>
              </HStack>
            </Stack>
          </Surface>
        ) : null}

        <AsyncStateView
          error={usersQuery.error}
          isLoading={usersQuery.isLoading}
          onRetry={() => void usersQuery.refetch()}
        >
          {items.length === 0 ? (
            <FeedbackState
              description="Ajuste la búsqueda o los filtros para consultar otras cuentas."
              title="No hay usuarios que coincidan con los filtros"
            />
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
              {items.map((user) => (
                <Surface key={user.id} padding="normal">
                  <Stack gap={3}>
                    <HStack justify="space-between" wrap="wrap">
                      <Badge
                        colorPalette={user.globalRole === "ADMIN" ? "terracotta" : "gray"}
                        rounded="full"
                      >
                        {globalRoleLabels[user.globalRole]}
                      </Badge>
                      <Badge colorPalette={user.isActive ? "green" : "gray"} rounded="full">
                        {user.isActive ? "Activa" : "Inactiva"}
                      </Badge>
                    </HStack>
                    <Stack gap={1}>
                      <Text
                        color="text.default"
                        fontFamily="heading"
                        fontSize="xl"
                        fontWeight="700"
                      >
                        {user.firstName} {user.lastName}
                      </Text>
                      <Text color="text.muted">{user.email}</Text>
                      <Text color="text.muted" fontSize="sm" fontWeight="700">
                        Cédula {user.identificationNumber}
                      </Text>
                    </Stack>
                    <Text color="text.default" fontWeight="700">
                      {[user.unit?.code ?? "Sin unidad", user.career?.name ?? "Sin carrera"].join(
                        " · ",
                      )}
                    </Text>
                    <Button asChild colorPalette="terracotta" rounded="full" variant="outline">
                      <RouterLink to={`/admin/usuarios/${user.id}`}>
                        Ver detalle de {user.firstName} {user.lastName}
                      </RouterLink>
                    </Button>
                  </Stack>
                </Surface>
              ))}
            </SimpleGrid>
          )}
          <PaginationControls
            currentPage={usersQuery.page?.page ?? page}
            itemLabel="usuarios"
            onPageChange={setPage}
            pageCount={usersQuery.page?.totalPages ?? 1}
            pageSize={usersQuery.page?.limit ?? 20}
            totalItems={usersQuery.page?.total ?? 0}
          />
        </AsyncStateView>
      </Stack>
    </ModuleShell>
  );
}
