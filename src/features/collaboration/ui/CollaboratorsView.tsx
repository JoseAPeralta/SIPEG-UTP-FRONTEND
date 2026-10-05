import { Button, Field, Heading, HStack, Input, NativeSelect, Stack, Text } from "@chakra-ui/react";
import { useRef, useState } from "react";
import { AsyncStateView, FeedbackState, SectionHeader, Surface } from "@/components";
import { useUsersPage } from "@/features/users";
import { useSessionStore } from "@/store/session";
import type { CollaborationScope } from "../model/ownPermissions";
import type { EffectiveCollaborator } from "../model/collaborators";
import {
  COLLABORATION_ROLES,
  PERMISSION_NAMES,
  isCollaborationRole,
  resolveCollaborationRoleLabel,
  type CollaborationRole,
  type PermissionName,
} from "../model/permissions";
import { useCollaborators } from "../hooks/useCollaborators";
import { useCollaboratorMutations } from "../hooks/useCollaboratorMutations";
import { CollaboratorPermissionManager } from "./CollaboratorPermissionManager";
import { PermissionList } from "./PermissionList";

export type CollaboratorsViewProps = {
  scope: CollaborationScope;
  canManage: boolean;
  /**
   * Permisos que el operador puede delegar. Se omite el filtro cuando el llamador no lo conoce; el
   * backend rechaza igualmente lo que el actor no posee.
   */
  grantablePermissions?: readonly PermissionName[];
};

function AdminPersonSearch({
  onSelect,
  disabled,
}: {
  onSelect: (id: string) => void;
  disabled: boolean;
}) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const users = useUsersPage({ q: query, isActive: true }, page);
  return (
    <Stack gap={2}>
      <Field.Root>
        <Field.Label>Buscar persona</Field.Label>
        <Input
          minH="44px"
          value={search}
          disabled={disabled}
          onChange={(event) => setSearch(event.target.value)}
        />
      </Field.Root>
      <Button
        minH="44px"
        variant="outline"
        disabled={disabled}
        onClick={() => {
          setQuery(search.trim());
          setPage(1);
        }}
      >
        Buscar personas
      </Button>
      {users.error ? <Text role="alert">No se pudieron consultar las personas.</Text> : null}
      {users.isFetching ? <Text role="status">Consultando personas…</Text> : null}
      {(users.page?.items ?? []).map((person) => (
        <Button
          key={person.id}
          variant="outline"
          minH="44px"
          whiteSpace="normal"
          height="auto"
          disabled={disabled || users.isFetching || Boolean(users.error)}
          onClick={() => onSelect(person.id)}
        >
          Seleccionar a {person.firstName} {person.lastName}
        </Button>
      ))}
      <HStack wrap="wrap">
        <Button
          variant="outline"
          minH="44px"
          disabled={disabled || page <= 1 || users.isFetching}
          onClick={() => setPage((current) => current - 1)}
        >
          Personas anteriores
        </Button>
        <Button
          variant="outline"
          minH="44px"
          disabled={disabled || !users.page || page >= users.page.totalPages || users.isFetching}
          onClick={() => setPage((current) => current + 1)}
        >
          Personas siguientes
        </Button>
      </HStack>
    </Stack>
  );
}

function CollaboratorRow({
  person,
  mutations,
  grantablePermissions,
  onSuccess,
}: {
  person: EffectiveCollaborator;
  mutations: ReturnType<typeof useCollaboratorMutations>;
  grantablePermissions: readonly PermissionName[];
  onSuccess: (message: string) => void;
}) {
  const [role, setRole] = useState(person.role);
  const [confirm, setConfirm] = useState(false);
  const removeButton = useRef<HTMLButtonElement>(null);
  const name = `${person.firstName} ${person.lastName}`;
  return (
    <Surface padding="normal">
      <Stack gap={4}>
        <Heading as="h3" size="md">
          {name}
        </Heading>
        <Text overflowWrap="anywhere">{person.email}</Text>
        <Text>Rol actual: {resolveCollaborationRoleLabel(person.role)}</Text>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (mutations.isPending) return;
            mutations.reset();
            void mutations
              .change(person.userId, { role })
              .then(() => onSuccess("Rol actualizado."))
              .catch(() => undefined);
          }}
        >
          <Stack gap={3}>
            <Field.Root>
              <Field.Label>Rol de {name}</Field.Label>
              <NativeSelect.Root disabled={mutations.isPending}>
                <NativeSelect.Field
                  minH="44px"
                  value={role}
                  onChange={(event) => {
                    if (isCollaborationRole(event.target.value)) setRole(event.target.value);
                  }}
                >
                  {COLLABORATION_ROLES.map((value) => (
                    <option key={value} value={value}>
                      {resolveCollaborationRoleLabel(value)}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>
            <HStack wrap="wrap">
              <Button
                type="submit"
                maxW="full"
                whiteSpace="normal"
                height="auto"
                py={2}
                minH="44px"
                disabled={mutations.isPending || role === person.role}
              >
                Guardar rol de {name}
              </Button>
              <Button
                ref={removeButton}
                maxW="full"
                whiteSpace="normal"
                height="auto"
                py={2}
                variant="outline"
                minH="44px"
                disabled={mutations.isPending}
                onClick={() => {
                  mutations.reset();
                  setConfirm(true);
                }}
              >
                Retirar a {name}
              </Button>
            </HStack>
          </Stack>
        </form>
        {confirm ? (
          <Stack gap={2} role="group" aria-label={`Confirmar retirada de ${name}`}>
            <Text>
              ¿Retirar la colaboración local de {name}? Los permisos heredados del programa pueden
              conservar su acceso.
            </Text>
            <HStack wrap="wrap">
              <Button
                autoFocus
                maxW="full"
                whiteSpace="normal"
                height="auto"
                py={2}
                minH="44px"
                disabled={mutations.isPending}
                onClick={() => {
                  if (mutations.isPending) return;
                  mutations.reset();
                  void mutations
                    .remove(person.userId)
                    .then(() => {
                      setConfirm(false);
                      onSuccess("Colaboración retirada.");
                    })
                    .catch(() => undefined);
                }}
              >
                Confirmar retirada de {name}
              </Button>
              <Button
                variant="outline"
                minH="44px"
                disabled={mutations.isPending}
                onClick={() => {
                  setConfirm(false);
                  removeButton.current?.focus();
                }}
              >
                Cancelar retirada
              </Button>
            </HStack>
          </Stack>
        ) : null}
        <details>
          <summary style={{ minHeight: "44px", paddingBlock: "10px", cursor: "pointer" }}>
            Ver permisos de {name}
          </summary>
          <Stack gap={4} pt={3}>
            <PermissionList permissions={person.permissions} />
            <CollaboratorPermissionManager
              person={person}
              grantablePermissions={grantablePermissions}
              mutations={mutations}
              onSuccess={onSuccess}
            />
          </Stack>
        </details>
      </Stack>
    </Surface>
  );
}

/** Gestión local. El caller obtiene canManage de permisos efectivos; el backend conserva la autoridad. */
export function CollaboratorsView({
  scope,
  canManage,
  grantablePermissions = PERMISSION_NAMES,
}: CollaboratorsViewProps) {
  const query = useCollaborators(scope, canManage);
  const mutations = useCollaboratorMutations(scope);
  const isAdmin = useSessionStore((state) => state.currentUser?.globalRole === "ADMIN");
  const [target, setTarget] = useState("");
  const [role, setRole] = useState<CollaborationRole>("VIEWER");
  const [success, setSuccess] = useState<string | null>(null);
  if (!canManage)
    return (
      <FeedbackState
        title="Colaboradores restringidos"
        description="Necesita capacidad de delegación para consultar o gestionar colaboradores."
      />
    );
  return (
    <Stack gap={5}>
      <SectionHeader
        title="Colaboradores locales"
        description="La lista muestra colaboraciones de este contexto y sus permisos efectivos. Las personas con acceso exclusivamente heredado no se enumeran aquí."
      />
      <AsyncStateView
        isLoading={query.isLoading}
        error={query.error ? new Error("No se pudieron consultar los colaboradores.") : null}
        onRetry={() => {
          void query.refetch();
        }}
      >
        {success ? <Text role="status">{success}</Text> : null}
        {mutations.failure ? (
          <Stack gap={2}>
            <Text role="alert">{mutations.failure}</Text>
            <Button
              variant="outline"
              minH="44px"
              onClick={() => {
                void query.refetch();
              }}
            >
              Actualizar colaboradores
            </Button>
          </Stack>
        ) : null}
        <Surface padding="normal">
          <Stack gap={4}>
            <Heading as="h3" size="md">
              Agregar persona
            </Heading>
            {isAdmin ? (
              <AdminPersonSearch disabled={mutations.isPending} onSelect={setTarget} />
            ) : null}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (mutations.isPending || !target.trim()) return;
                mutations.reset();
                setSuccess(null);
                void mutations
                  .add({ userId: target.trim(), role })
                  .then(() => {
                    setTarget("");
                    setSuccess("Colaborador agregado.");
                  })
                  .catch(() => undefined);
              }}
            >
              <Stack gap={3}>
                <Field.Root required>
                  <Field.Label>Identificador de la persona</Field.Label>
                  <Input
                    minH="44px"
                    required
                    minLength={1}
                    maxLength={100}
                    value={target}
                    disabled={mutations.isPending}
                    onChange={(event) => setTarget(event.target.value)}
                  />
                  <Field.HelperText>
                    {isAdmin
                      ? "Seleccione una persona en la búsqueda o ingrese su identificador."
                      : "Ingrese el identificador de la cuenta proporcionado por la persona o la administración."}
                  </Field.HelperText>
                </Field.Root>
                <Field.Root>
                  <Field.Label>Rol del nuevo colaborador</Field.Label>
                  <NativeSelect.Root disabled={mutations.isPending}>
                    <NativeSelect.Field
                      minH="44px"
                      value={role}
                      onChange={(event) => {
                        if (isCollaborationRole(event.target.value)) setRole(event.target.value);
                      }}
                    >
                      {COLLABORATION_ROLES.map((value) => (
                        <option key={value} value={value}>
                          {resolveCollaborationRoleLabel(value)}
                        </option>
                      ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Field.Root>
                <Button type="submit" minH="44px" disabled={mutations.isPending || !target.trim()}>
                  Agregar colaborador
                </Button>
              </Stack>
            </form>
          </Stack>
        </Surface>
        {(query.data ?? []).length === 0 ? (
          <FeedbackState
            title="Sin colaboradores locales"
            description="Puede agregar una persona con el formulario. El acceso heredado puede existir aunque esta lista esté vacía."
          />
        ) : null}
        {(query.data ?? []).map((person) => (
          <CollaboratorRow
            key={`${person.userId}:${person.role}`}
            person={person}
            mutations={mutations}
            grantablePermissions={grantablePermissions}
            onSuccess={setSuccess}
          />
        ))}
      </AsyncStateView>
    </Stack>
  );
}
