import { Box } from "@chakra-ui/react";
import { Navigate, useNavigate, useSearchParams } from "react-router";

import type { AuthCredentials } from "@/app/adapters";
import { LoginForm, useLogin } from "@/features/auth";
import { useSessionStore } from "@/store/session";

export function LoginPage() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const { error, isPending, login } = useLogin();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isActivated = searchParams.get("activated") === "1";

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
      {isActivated ? (
        <Box
          bg="green.50"
          border="1px solid"
          borderColor="green.200"
          borderRadius="md"
          color="green.800"
          mb={4}
          p={4}
          role="status"
        >
          Tu cuenta ha sido activada. Inicia sesion para continuar.
        </Box>
      ) : null}
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
