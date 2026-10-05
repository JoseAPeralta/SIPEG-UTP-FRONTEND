import { Box } from "@chakra-ui/react";
import { Navigate, useNavigate, useSearchParams } from "react-router";

import type { AuthCredentials } from "@/app/adapters";
import { StatusPanel } from "@/components";
import { LoginForm, resolveAuthLandingPath, SESSION_END_MESSAGES, useLogin } from "@/features/auth";
import { useSessionStore } from "@/store/session";

export function LoginPage() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const sessionEndReason = useSessionStore((state) => state.sessionEndReason);
  const { errorMessage, isPending, login } = useLogin();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isActivated = searchParams.get("activated") === "1";
  const isPasswordReset = searchParams.get("reset") === "1";

  if (currentUser) {
    return <Navigate replace to={resolveAuthLandingPath(currentUser.globalRole)} />;
  }

  const handleLogin = async (credentials: AuthCredentials) => {
    try {
      const session = await login(credentials);
      void navigate(resolveAuthLandingPath(session.currentUser.globalRole), { replace: true });
    } catch {
      // The mutation exposes a localized form-level message below.
    }
  };

  return (
    <Box maxW="lg" mx="auto" py={{ base: 3, md: 6 }}>
      {sessionEndReason ? (
        <Box mb={4}>
          <StatusPanel role="status">{SESSION_END_MESSAGES[sessionEndReason]}</StatusPanel>
        </Box>
      ) : null}
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
          Su cuenta ha sido activada. Inicie sesion para continuar.
        </Box>
      ) : null}
      {isPasswordReset ? (
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
          Su contraseña ha sido restablecida. Inicie sesión para continuar.
        </Box>
      ) : null}
      <LoginForm errorMessage={errorMessage} isSubmitting={isPending} onSubmit={handleLogin} />
    </Box>
  );
}

export default LoginPage;
