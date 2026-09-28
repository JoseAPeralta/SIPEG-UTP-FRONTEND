import { ModuleShell } from "@/components";
import { RegisterView } from "@/features/registration";

export function RegisterPage() {
  return (
    <ModuleShell
      description="Completa tus datos para crear una cuenta. Recibirás un correo para verificarla antes de iniciar sesión."
      headingLabel="Registro público"
      title="Crea tu cuenta en SIPEG"
    >
      <RegisterView />
    </ModuleShell>
  );
}

export default RegisterPage;
