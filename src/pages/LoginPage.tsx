import { Box } from "@chakra-ui/react";
import { Navigate, useNavigate } from "react-router";

import type { AuthCredentials } from "@/app/adapters";
import { LoginForm, useLogin } from "@/features/auth";
import { useSessionStore } from "@/store/session";

export function LoginPage() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const { error, isPending, login } = useLogin();
  const navigate = useNavigate();

  if (currentUser) {
    return <Navigate replace to={currentUser.globalRole === "ADMIN" ? "/admin" : "/"} />;
  }

  const handleLogin = async (credentials: AuthCredentials) => {
    try {
      await login(credentials);
      void navigate("/admin", { replace: true });
    } catch {
      // The mutation exposes a localized form-level message below.
    }
  };

  return (
    <Box maxW="lg" mx="auto" py={{ base: 3, md: 6 }}>
      <LoginForm
        errorMessage={
          error
            ? "No fue posible iniciar sesion. Verifica tus credenciales e intenta de nuevo."
            : null
        }
        isSubmitting={isPending}
        onSubmit={handleLogin}
      />
    </Box>
  );
}

export default LoginPage;
