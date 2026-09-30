import { Box, Button, Stack } from "@chakra-ui/react";
import { useState } from "react";
import { Link as RouterLink } from "react-router";
import type { PasswordResetRequest } from "@/app/adapters";
import { FeedbackState, ModuleShell } from "@/components";
import {
  ForgotPasswordForm,
  type PasswordRecoveryFailure,
  useRequestPasswordReset,
} from "@/features/auth";

const REQUEST_CONFIRMATION =
  "Si existe una cuenta asociada al correo, recibirá un enlace para restablecer su contraseña.";

const GENERIC_ERROR = "No se pudo completar la solicitud. Intente de nuevo en unos minutos.";
const THROTTLED_ERROR = "Ha enviado demasiadas solicitudes. Espere un momento e intente de nuevo.";

function readErrorMessage(failure: PasswordRecoveryFailure) {
  return failure === "throttled" ? THROTTLED_ERROR : GENERIC_ERROR;
}

export function ForgotPasswordPage() {
  const { failure, isPending, isSuccess, requestPasswordReset } = useRequestPasswordReset();
  const [hasRequested, setHasRequested] = useState(false);

  const handleSubmit = async (request: PasswordResetRequest) => {
    try {
      await requestPasswordReset(request);
      setHasRequested(true);
    } catch {
      // The mutation exposes a localized form-level message below.
    }
  };

  return (
    <Box maxW="lg" mx="auto" py={{ base: 3, md: 6 }}>
      <ModuleShell
        description="La solicitud no confirma si una cuenta existe: la respuesta es la misma en ambos casos."
        headingLabel="Recuperación de acceso"
        title="Recuperar contraseña"
      >
        {isSuccess && hasRequested ? (
          <FeedbackState
            action={
              <Stack
                align={{ base: "stretch", md: "center" }}
                direction={{ base: "column", md: "row" }}
                gap={3}
              >
                <Button asChild colorPalette="terracotta" rounded="full">
                  <RouterLink to="/login">Volver a iniciar sesión</RouterLink>
                </Button>
                <Button onClick={() => setHasRequested(false)} rounded="full" variant="outline">
                  Solicitar otro enlace
                </Button>
              </Stack>
            }
            description={REQUEST_CONFIRMATION}
            role="status"
            title="Revise su correo electrónico"
          />
        ) : (
          <ForgotPasswordForm
            errorMessage={failure ? readErrorMessage(failure) : null}
            isSubmitting={isPending}
            onSubmit={handleSubmit}
          />
        )}
      </ModuleShell>
    </Box>
  );
}

export default ForgotPasswordPage;
