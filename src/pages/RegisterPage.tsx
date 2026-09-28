import { ModuleShell } from "@/components";
import { RegisterView } from "@/features/registration";

export function RegisterPage() {
  return (
    <ModuleShell
      description="Complete sus datos para crear una cuenta. Recibirá un correo para verificarla antes de iniciar sesión."
      headingLabel="Registro público"
      title="Cree su cuenta en SIPEG"
    >
      <RegisterView />
    </ModuleShell>
  );
}

export default RegisterPage;
