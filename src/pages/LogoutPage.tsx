import { Box, Button } from "@chakra-ui/react";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";

import { StatusPanel } from "@/components";
import { useLogout } from "@/features/auth";

export function LogoutPage() {
  const { logout, errorMessage, isPending } = useLogout();
  const hasStarted = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (hasStarted.current) {
      return;
    }

    hasStarted.current = true;
    void logout().then(
      () => navigate("/", { replace: true }),
      () => undefined,
    );
  }, [logout, navigate]);

  return (
    <Box mx="auto" my={{ base: 10, md: 16 }} w="min(100% - 2rem, 32rem)">
      {errorMessage ? (
        <StatusPanel role="alert">
          {errorMessage}
          <Button
            mt={4}
            loading={isPending}
            onClick={() => {
              void logout().then(
                () => navigate("/", { replace: true }),
                () => undefined,
              );
            }}
          >
            Reintentar cierre de sesion
          </Button>
        </StatusPanel>
      ) : (
        <StatusPanel>Cerrando sesion...</StatusPanel>
      )}
    </Box>
  );
}

export default LogoutPage;
