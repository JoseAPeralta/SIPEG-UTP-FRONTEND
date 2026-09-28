import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";

import { ModuleShell, StatusPanel } from "@/components";

import { useVerifyEmail } from "@/features/auth";

function readTokenFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("token");
}

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const { error, isPending, verify } = useVerifyEmail();
  const hasAttempted = useRef(false);
  const token = readTokenFromUrl();

  useEffect(() => {
    if (!token || hasAttempted.current) {
      return;
    }

    hasAttempted.current = true;

    void verify(token)
      .then(() => {
        window.history.replaceState({}, "", "/verify-email");
        void navigate("/login?activated=1", { replace: true });
      })
      .catch(() => undefined);
  }, [token, verify, navigate]);

  if (!token) {
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

  if (isPending) {
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

  if (error) {
    return (
      <ModuleShell
        description="No fue posible activar su cuenta. El enlace puede haber expirado o haber sido utilizado anteriormente."
        headingLabel="Activacion de cuenta"
        title="Error de activacion"
      >
        <StatusPanel role="alert">
          No fue posible activar su cuenta. Solicite un nuevo correo de verificacion.
        </StatusPanel>
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
