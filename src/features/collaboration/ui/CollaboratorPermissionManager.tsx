import { Button, Field, Heading, Input, NativeSelect, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import type { EffectiveCollaborator } from "../model/collaborators";
import {
  isPermissionName,
  resolvePermissionLabel,
  type PermissionName,
} from "../model/permissions";
import { localDateTimeToInstant, validatePermissionWindow } from "../model/permissionWindow";
import type { useCollaboratorMutations } from "../hooks/useCollaboratorMutations";

export type CollaboratorPermissionManagerProps = {
  person: EffectiveCollaborator;
  grantablePermissions: readonly PermissionName[];
  mutations: ReturnType<typeof useCollaboratorMutations>;
  onSuccess: (message: string) => void;
};

/**
 * Gestion de concesiones locales de una persona. Solo ofrece revocar lo que vive en este scope;
 * un permiso exclusivamente heredado se explica y se retira en el programa. La ventana se valida
 * localmente y el backend conserva la ultima palabra sobre la vigencia del delegador.
 */
export function CollaboratorPermissionManager({
  person,
  grantablePermissions,
  mutations,
  onSuccess,
}: CollaboratorPermissionManagerProps) {
  const name = `${person.firstName} ${person.lastName}`;
  const [permission, setPermission] = useState<PermissionName>(
    grantablePermissions[0] ?? "activity:read",
  );
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [windowError, setWindowError] = useState<string | null>(null);
  const localPermissions = person.permissions.filter(
    (item) => item.origin !== "INHERITED" && isPermissionName(item.name),
  );

  return (
    <Stack gap={4}>
      <Heading as="h4" size="sm">
        Gestionar permisos directos
      </Heading>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (mutations.isPending) return;
          const from = validFrom.trim() ? localDateTimeToInstant(validFrom) : null;
          const until = validUntil.trim() ? localDateTimeToInstant(validUntil) : null;
          if ((validFrom.trim() && from === null) || (validUntil.trim() && until === null)) {
            setWindowError("El inicio o el fin de vigencia no son fechas válidas.");
            return;
          }
          const message = validatePermissionWindow({ validFrom: from, validUntil: until });
          if (message) {
            setWindowError(message);
            return;
          }
          setWindowError(null);
          mutations.reset();
          void mutations
            .grant({ userId: person.userId, permission, validFrom: from, validUntil: until })
            .then(() => {
              setValidFrom("");
              setValidUntil("");
              onSuccess("Permiso otorgado.");
            })
            .catch(() => undefined);
        }}
      >
        <Stack gap={3}>
          <Field.Root>
            <Field.Label>Permiso a otorgar</Field.Label>
            <NativeSelect.Root disabled={mutations.isPending || !grantablePermissions.length}>
              <NativeSelect.Field
                minH="44px"
                value={permission}
                onChange={(event) => {
                  if (isPermissionName(event.target.value)) setPermission(event.target.value);
                }}
              >
                {grantablePermissions.map((value) => (
                  <option key={value} value={value}>
                    {resolvePermissionLabel(value)}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
            <Field.HelperText>
              Solo puede delegar permisos que usted posee y dentro de su propia vigencia.
            </Field.HelperText>
          </Field.Root>
          <Field.Root>
            <Field.Label>Inicio de vigencia (opcional)</Field.Label>
            <Input
              minH="44px"
              type="datetime-local"
              value={validFrom}
              disabled={mutations.isPending}
              onChange={(event) => setValidFrom(event.target.value)}
            />
          </Field.Root>
          <Field.Root>
            <Field.Label>Fin de vigencia (opcional)</Field.Label>
            <Input
              minH="44px"
              type="datetime-local"
              value={validUntil}
              disabled={mutations.isPending}
              onChange={(event) => setValidUntil(event.target.value)}
            />
            <Field.HelperText>
              Sin fechas, el permiso no vence. Un inicio futuro aparece en la lista cuando comience
              su vigencia.
            </Field.HelperText>
          </Field.Root>
          {windowError ? <Text role="alert">{windowError}</Text> : null}
          <Button
            type="submit"
            minH="44px"
            disabled={mutations.isPending || !grantablePermissions.length}
          >
            Otorgar permiso
          </Button>
        </Stack>
      </form>
      <Stack gap={2}>
        <Text fontWeight="bold">Concesiones locales de {name}</Text>
        {localPermissions.length === 0 ? (
          <Text color="text.muted">No hay concesiones locales registradas para {name}.</Text>
        ) : null}
        {localPermissions.map((item) => (
          <Stack
            key={item.name}
            borderWidth="1px"
            borderColor="border.subtle"
            rounded="lg"
            p={3}
            gap={2}
          >
            <Text>{resolvePermissionLabel(item.name)}</Text>
            {item.origin === "BOTH" ? (
              <Text fontSize="sm" color="text.muted">
                El acceso heredado del programa continuará vigente.
              </Text>
            ) : null}
            <Button
              variant="outline"
              minH="44px"
              maxW="full"
              whiteSpace="normal"
              height="auto"
              py={2}
              disabled={mutations.isPending}
              onClick={() => {
                if (mutations.isPending || !isPermissionName(item.name)) return;
                mutations.reset();
                void mutations
                  .revoke({ userId: person.userId, permission: item.name })
                  .then(() => onSuccess("Permiso revocado."))
                  .catch(() => undefined);
              }}
            >
              Revocar {resolvePermissionLabel(item.name)}
            </Button>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
