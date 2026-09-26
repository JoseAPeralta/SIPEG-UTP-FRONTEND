import { Box } from "@chakra-ui/react";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";

import { StatusPanel } from "@/components";
import { useLogout } from "@/features/auth";

export function LogoutPage() {
  const { logout } = useLogout();
  const hasStarted = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (hasStarted.current) {
      return;
    }

    hasStarted.current = true;
    void logout().finally(() => navigate("/", { replace: true }));
  }, [logout, navigate]);

  return (
    <Box mx="auto" my={{ base: 10, md: 16 }} w="min(100% - 2rem, 32rem)">
      <StatusPanel>Cerrando sesion...</StatusPanel>
    </Box>
  );
}

export default LogoutPage;
