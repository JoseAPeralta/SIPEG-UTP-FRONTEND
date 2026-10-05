import { Box, Button, Stack } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router";

import type { PasswordResetPayload } from "@/app/adapters";
import { FeedbackState, ModuleShell } from "@/components";
import { type PasswordRecoveryFailure, ResetPasswordForm, useResetPassword } from "@/features/auth";

const GENERIC_ERROR = "No se pudo completar la solicitud. Intente de nuevo en unos minutos.";
const INVALID_LINK_ERROR =
  "El enlace es inválido o ha expirado. Solicite un enlace nuevo para continuar.";
const THROTTLED_ERROR = "Ha realizado demasiados intentos. Espere un momento e intente de nuevo.";

const FAILURE_MESSAGES: Record<PasswordRecoveryFailure, string> = {
  invalid: INVALID_LINK_ERROR,
  throttled: THROTTLED_ERROR,
  unknown: GENERIC_ERROR,
};

function readTokenFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get("token");
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { failure, isPending, resetPassword } = useResetPassword();
  const [rawToken] = useState(readTokenFromUrl);
  const token = rawToken?.trim() ? rawToken : null;

  useEffect(() => {
    window.history.replaceState({}, "", "/reset-password");
  }, []);

  const handleSubmit = async (payload: PasswordResetPayload) => {
    try {
      await resetPassword(payload);
      void navigate("/login?reset=1", { replace: true });
    } catch {
      // The mutation exposes a localized form-level message below.
    }
  };

  return (
    <Box maxW="lg" mx="auto" py={{ base: 3, md: 6 }}>
      <ModuleShell
        description="El enlace de recuperación es de un solo uso y caduca después de un tiempo."
        headingLabel="Recuperación de acceso"
        title="Restablecer contraseña"
      >
        {token ? (
          <ResetPasswordForm
            errorMessage={failure ? FAILURE_MESSAGES[failure] : null}
            isSubmitting={isPending}
            onSubmit={handleSubmit}
            token={token}
          />
        ) : (
          <FeedbackState
            action={
              <Stack
                align={{ base: "stretch", md: "center" }}
                direction={{ base: "column", md: "row" }}
                gap={3}
              >
                <Button asChild colorPalette="terracotta" rounded="full">
                  <RouterLink to="/forgot-password">Solicitar un enlace nuevo</RouterLink>
                </Button>
                <Button asChild rounded="full" variant="outline">
                  <RouterLink to="/login">Volver a iniciar sesión</RouterLink>
                </Button>
              </Stack>
            }
            description="No encontramos un enlace para restablecer su contraseña. Solicite uno nuevo con el correo de su cuenta."
            role="alert"
            title="Enlace no válido"
          />
        )}
      </ModuleShell>
    </Box>
  );
}

export default ResetPasswordPage;
