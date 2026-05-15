import { Box, Button, Heading, Stack, Text } from "@chakra-ui/react";
import { Navigate, useNavigate } from "react-router";

import { users } from "@/data/sipeg";
import { useSessionStore } from "@/store/session";
import type { User } from "@/types/domain";

function getDemoUser(): User {
  const demoUser = users.find((user) => user.role === "admin");

  if (!demoUser) {
    throw new Error("Demo administrator user was not found");
  }

  return demoUser;
}

const demoUser = getDemoUser();

export function LoginPage() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const login = useSessionStore((state) => state.login);
  const navigate = useNavigate();

  if (currentUser) {
    return <Navigate replace to="/admin" />;
  }

  const handleLogin = () => {
    login(demoUser);
    void navigate("/admin", { replace: true });
  };

  return (
    <Box maxW="lg" mx="auto" py={{ base: 3, md: 6 }}>
      <Box
        bg="surface.raised"
        borderColor="border.subtle"
        borderWidth="1px"
        p={{ base: 6, md: 8 }}
        rounded="3xl"
        shadow="0 24px 80px rgba(65, 31, 20, 0.14)"
      >
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
          <Button colorPalette="red" onClick={handleLogin} rounded="full" size="lg">
            Iniciar sesion
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

export default LoginPage;
