import { Box, Stack, Text } from "@chakra-ui/react";
import { resolvePermissionLabel } from "../model/permissions";
import type { PermissionListItem } from "../model/ownPermissions";

export type PermissionListProps = { permissions: readonly PermissionListItem[] };
const origins = { LOCAL: "Local", INHERITED: "Heredado del programa", BOTH: "Local y heredado" };
const date = (value: string) =>
  new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Panama",
  }).format(new Date(value));

/** Lectura de permisos efectivos. Nunca ofrece revocación local de acceso heredado. */
export function PermissionList({ permissions }: PermissionListProps) {
  if (!permissions.length) return <Text>No hay permisos efectivos en este contexto.</Text>;
  return (
    <Stack as="ul" gap={3} listStyleType="none" p={0} aria-label="Permisos efectivos">
      {permissions.map((permission, index) => (
        <Box
          as="li"
          key={`${permission.name}-${index}`}
          borderWidth="1px"
          borderColor="border.subtle"
          rounded="lg"
          p={4}
        >
          <Text fontWeight="bold">{resolvePermissionLabel(permission.name)}</Text>
          <Text>{origins[permission.origin]}</Text>
          {permission.source ? (
            <Text color="text.muted">
              {permission.origin === "INHERITED"
                ? "Concesión del programa"
                : permission.source === "ROLE_DEFAULT"
                  ? "Por rol local"
                  : "Concesión directa local"}
            </Text>
          ) : null}
          <Text fontSize="sm">
            {permission.validFrom ? `Desde ${date(permission.validFrom)}` : "Sin límite de inicio"}{" "}
            · {permission.validUntil ? `Hasta ${date(permission.validUntil)}` : "Sin vencimiento"}{" "}
            (hora de Panamá)
          </Text>
          <Text fontSize="sm">
            {permission.effective === false
              ? "No efectivo en la respuesta"
              : "Vigente al consultar"}
          </Text>
          {permission.origin !== "LOCAL" ? (
            <Text fontSize="sm" color="text.muted">
              Retirar el acceso local no elimina el permiso heredado del programa.
            </Text>
          ) : null}
        </Box>
      ))}
    </Stack>
  );
}
