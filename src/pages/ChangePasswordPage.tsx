import { Button, Stack } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router";

import type { PasswordChangeRequest } from "@/app/adapters";
import { FeedbackState } from "@/components";
import { ChangePasswordForm, type PasswordChangeFailure, useChangePassword } from "@/features/auth";

const FAILURE_MESSAGES: Record<PasswordChangeFailure, string> = {
  forbidden: "No tiene permiso para cambiar la contraseña de esta cuenta.",
  invalid: "No fue posible validar el cambio con la contraseña actual.",
  throttled: "Ha realizado demasiados intentos. Espere un momento e intente de nuevo.",
  unauthenticated: "Su sesión no está autorizada. Inicie sesión nuevamente para continuar.",
  unknown: "No fue posible cambiar la contraseña. Intente de nuevo en unos minutos.",
};

/**
 * Security section of the personal area. It keeps its own mutation state and its own localized copy,
 * and it does not read the institutional catalog, so a catalog failure can no longer hide the
 * password change. The route heading belongs to `PersonalAreaLayout`.
 */
export function ChangePasswordPage() {
  const { changePassword, failure, isPending, isSuccess } = useChangePassword();

  const handleSubmit = async (request: PasswordChangeRequest) => {
    try {
      await changePassword(request);
    } catch {
      // The mutation exposes a localized form-level message below.
    }
  };

  if (isSuccess) {
    return (
      <FeedbackState
        action={
          <Stack
            align={{ base: "stretch", md: "center" }}
            direction={{ base: "column", md: "row" }}
            gap={3}
          >
            <Button asChild colorPalette="terracotta" rounded="full">
              <RouterLink to="/">Ir al catálogo de actividades</RouterLink>
            </Button>
            <Button asChild rounded="full" variant="outline">
              <RouterLink to="/logout">Cerrar sesión</RouterLink>
            </Button>
          </Stack>
        }
        description="Su contraseña fue actualizada. Esta sesión sigue activa y sus otras sesiones abiertas se cerraron, por lo que deberán iniciar sesión nuevamente."
        role="status"
        title="Contraseña actualizada"
      />
    );
  }

  return (
    <ChangePasswordForm
      errorMessage={failure ? FAILURE_MESSAGES[failure] : null}
      isSubmitting={isPending}
      onSubmit={handleSubmit}
    />
  );
}

export default ChangePasswordPage;
