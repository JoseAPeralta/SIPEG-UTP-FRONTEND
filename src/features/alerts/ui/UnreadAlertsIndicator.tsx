import { Box, VisuallyHidden } from "@chakra-ui/react";
import { NavLink } from "react-router";

import { useUnreadAlertsCount } from "../hooks/useUnreadAlertsCount";

/**
 * Acceso global a la bandeja de alertas con el conteo de no leidas.
 *
 * El enlace apunta siempre a la ruta personal, incluso si el conteo aun carga o fallo. La forma
 * corta visible es decorativa y el texto alternativo viaja visualmente oculto dentro de una region
 * `aria-live` discreta, de modo que cada cambio de conteo se anuncie sin mover el foco y sin
 * convertir cada pantalla autenticada en un segundo `role="status"`. Un fallo nunca se presenta
 * como cero. El estado activo usa `aria-current` y relleno, nunca solo color.
 */
export function UnreadAlertsIndicator() {
  const { count, error, isLoading } = useUnreadAlertsCount();

  const hasSessionData = count !== null || isLoading || error !== null;

  if (!hasSessionData) {
    return null;
  }

  const display = isLoading ? "…" : error ? "—" : String(count);
  const summary = isLoading
    ? "Cargando alertas"
    : error
      ? "No se pudo actualizar el conteo de alertas"
      : count === 0
        ? "No tienes alertas sin leer"
        : count === 1
          ? "Tienes 1 alerta sin leer"
          : `Tienes ${count} alertas sin leer`;

  return (
    <NavLink style={{ textDecoration: "none" }} to="/perfil/alertas">
      {({ isActive }) => (
        <Box
          alignItems="center"
          aria-atomic="true"
          aria-live="polite"
          bg={isActive ? "accent.solid" : "surface.raised"}
          borderColor={isActive ? "accent.solid" : "border.subtle"}
          borderWidth="1px"
          color={isActive ? "accent.contrast" : "text.default"}
          display="inline-flex"
          fontSize="sm"
          fontWeight="800"
          minH="44px"
          px={4}
          py={2.5}
          rounded="full"
        >
          <VisuallyHidden>{summary}</VisuallyHidden>
          <Box aria-hidden="true" as="span">
            Alertas · {display}
          </Box>
        </Box>
      )}
    </NavLink>
  );
}
