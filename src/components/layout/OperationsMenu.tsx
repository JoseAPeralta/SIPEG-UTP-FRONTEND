import { Box, Field, NativeSelect, Stack } from "@chakra-ui/react";
import { NavLink, useLocation, useNavigate } from "react-router";
import { useOperationalAccess, operationalScopePath } from "@/features/collaboration/navigation";

/** El contexto operativo vive en la URL y sus opciones vienen del descubrimiento autorizado. */
export function OperationsMenu() {
  const { scopes, error, isLoading } = useOperationalAccess();
  const location = useLocation();
  const navigate = useNavigate();
  const selected = scopes.some((scope) => operationalScopePath(scope) === location.pathname)
    ? location.pathname
    : "";
  // El contexto `disabled` del campo es el que alcanza al `<select>` real: `NativeSelect.Root`
  // dentro de `Field.Root` no lo propaga, de modo que el control quedaría habilitado sin contextos.
  const disabled = isLoading || Boolean(error) || !scopes.length;
  return (
    <Box
      as="nav"
      aria-label="Navegación de operaciones"
      bg="surface.raised"
      borderBottomWidth="1px"
      borderColor="border.subtle"
      px={{ base: 4, md: 6 }}
      py={4}
    >
      <Stack
        direction={{ base: "column", md: "row" }}
        gap={4}
        maxW="7xl"
        mx="auto"
        align={{ base: "stretch", md: "center" }}
      >
        <NavLink
          end
          to="/operaciones"
          style={{ minHeight: "44px", display: "flex", alignItems: "center" }}
        >
          Mis contextos de trabajo
        </NavLink>
        <Field.Root disabled={disabled}>
          <Field.Label>Contexto operativo</Field.Label>
          <NativeSelect.Root>
            <NativeSelect.Field
              minH="44px"
              value={selected}
              onChange={(event) => {
                void navigate(event.target.value || "/operaciones");
              }}
            >
              <option value="">Seleccionar contexto</option>
              {scopes.map((scope) => (
                <option key={`${scope.type}:${scope.id}`} value={operationalScopePath(scope)}>
                  {scope.type === "program" ? "Programa" : "Actividad"}: {scope.name}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field.Root>
      </Stack>
    </Box>
  );
}
