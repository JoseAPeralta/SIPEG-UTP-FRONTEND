import { Button, Stack } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { ModuleShell, StatusPanel } from "@/components";

import { useVerifyEmail } from "@/features/auth";

type VerificationStep = "confirmed" | "failed" | "invalid" | "verifying";

function readTokenFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get("token");
}

/**
 * The token is read once and removed from the address bar as soon as the page mounts, so it never
 * lingers in the URL, in the browser history or in a shared link while the request is in flight or
 * after it fails. It is kept in component memory only, because a retry needs it and the user may
 * have lost connectivity the first time.
 */
export function VerifyEmailPage() {
  const navigate = useNavigate();
  const { errorMessage, verify } = useVerifyEmail();
  const [token] = useState(readTokenFromUrl);
  const [step, setStep] = useState<VerificationStep>(token ? "verifying" : "invalid");
  const hasAttempted = useRef(false);

  useEffect(() => {
    window.history.replaceState({}, "", "/verify-email");
  }, []);

  useEffect(() => {
    if (!token || hasAttempted.current) {
      return;
    }

    hasAttempted.current = true;

    void verify(token)
      .then(() => {
        setStep("confirmed");
        void navigate("/login?activated=1", { replace: true });
      })
      .catch(() => setStep("failed"));
  }, [token, verify, navigate]);

  const handleRetry = () => {
    if (!token) {
      return;
    }

    setStep("verifying");

    void verify(token)
      .then(() => {
        setStep("confirmed");
        void navigate("/login?activated=1", { replace: true });
      })
      .catch(() => setStep("failed"));
  };

  if (step === "invalid") {
    return (
      <ModuleShell
        description="El enlace de activacion no incluye un token valido. Solicite un nuevo correo de verificacion."
        headingLabel="Activacion de cuenta"
        title="Enlace invalido"
      >
        <StatusPanel role="alert">El enlace de activacion es invalido o ha expirado.</StatusPanel>
      </ModuleShell>
    );
  }

  if (step === "verifying") {
    return (
      <ModuleShell
        description="Estamos verificando su correo electronico. Este proceso toma solo unos segundos."
        headingLabel="Activacion de cuenta"
        title="Verificando su correo"
      >
        <StatusPanel>Verificando su correo electronico...</StatusPanel>
      </ModuleShell>
    );
  }

  if (step === "failed") {
    return (
      <ModuleShell
        description="No fue posible completar la activacion de su cuenta. Puede volver a intentarlo con el mismo enlace."
        headingLabel="Activacion de cuenta"
        title="Error de activacion"
      >
        <Stack gap={4}>
          <StatusPanel role="alert">{errorMessage}</StatusPanel>
          <Button alignSelf={{ base: "stretch", md: "start" }} onClick={handleRetry} rounded="full">
            Reintentar
          </Button>
        </Stack>
      </ModuleShell>
    );
  }

  return (
    <ModuleShell
      description="Su cuenta ha sido activada. Redirigiendo al inicio de sesion..."
      headingLabel="Activacion de cuenta"
      title="Cuenta activada"
    >
      <StatusPanel>Su cuenta ha sido activada. Redirigiendo...</StatusPanel>
    </ModuleShell>
  );
}

export default VerifyEmailPage;
