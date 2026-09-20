import { Box, Text } from "@chakra-ui/react";
import { useEffect } from "react";
import { useNavigate } from "react-router";

import { useSessionStore } from "@/store/session";

export function LogoutPage() {
  const logout = useSessionStore((state) => state.logout);
  const navigate = useNavigate();

  useEffect(() => {
    logout();
    void navigate("/", { replace: true });
  }, [logout, navigate]);

  return (
    <Box
      bg="surface.raised"
      borderColor="border.subtle"
      borderWidth="1px"
      mx="auto"
      my={{ base: 10, md: 16 }}
      p={6}
      rounded="3xl"
      role="status"
      w="min(100% - 2rem, 32rem)"
    >
      <Text color="text.muted" fontWeight="800">
        Cerrando sesion...
      </Text>
    </Box>
  );
}

export default LogoutPage;
