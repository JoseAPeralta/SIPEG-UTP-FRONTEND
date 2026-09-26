import { Box, Button, Heading, Stack, Text } from "@chakra-ui/react";
import { Navigate, useNavigate } from "react-router";

import { Surface } from "@/components";
import { useDemoAdminAccount } from "@/features/auth";
import { useSessionStore } from "@/store/session";

export function LoginPage() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const login = useSessionStore((state) => state.login);
  const { account, isLoading } = useDemoAdminAccount();
  const navigate = useNavigate();

  if (currentUser) {
    return <Navigate replace to="/admin" />;
  }

  const handleLogin = () => {
    if (!account) {
      return;
    }

    login(account);
    void navigate("/admin", { replace: true });
  };

  return (
    <Box maxW="lg" mx="auto" py={{ base: 3, md: 6 }}>
      <Surface elevation="overlay" padding="roomy">
        <Stack gap={6}>
          <Stack gap={3}>
            <Text
              color="accent.solid"
              fontSize="sm"
              fontWeight="800"
              letterSpacing="0.14em"
              textTransform="uppercase"
            >
              Acceso administrativo
            </Text>
            <Heading as="h1" fontFamily="heading" fontSize={{ base: "4xl", md: "5xl" }}>
              Iniciar sesion en SIPEG
            </Heading>
            <Text color="text.muted" lineHeight="1.7">
              Accede temporalmente con una cuenta demo mientras se integra el backend de
              autenticacion.
            </Text>
          </Stack>
          <Button
            colorPalette="terracotta"
            disabled={isLoading || !account}
            onClick={handleLogin}
            rounded="full"
            size="lg"
          >
            {isLoading ? "Cargando cuenta demo..." : "Iniciar sesion"}
          </Button>
          {!isLoading && !account ? (
            <Text color="text.muted" fontSize="sm" role="alert">
              No hay una cuenta administrativa disponible en el origen de datos actual.
            </Text>
          ) : null}
        </Stack>
      </Surface>
    </Box>
  );
}

export default LoginPage;
