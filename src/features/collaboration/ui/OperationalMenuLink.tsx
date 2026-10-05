import { Box } from "@chakra-ui/react";
import { NavLink } from "react-router";
import { useOperationalAccess } from "../hooks/useOperationalAccess";

/** Se carga solo con sesión. No anticipa acceso durante la consulta de descubrimiento. */
export function OperationalMenuLink() {
  const { scopes, error, isLoading } = useOperationalAccess();
  if (isLoading || error || !scopes.length) return null;
  return (
    <NavLink to="/operaciones" style={{ textDecoration: "none" }}>
      {({ isActive }) => (
        <Box
          minH="44px"
          bg={isActive ? "accent.solid" : "surface.raised"}
          borderWidth="1px"
          borderColor={isActive ? "accent.solid" : "border.subtle"}
          color={isActive ? "accent.contrast" : "text.default"}
          fontSize="sm"
          fontWeight="800"
          px={4}
          py={2.5}
          rounded="full"
        >
          Mis operaciones
        </Box>
      )}
    </NavLink>
  );
}
