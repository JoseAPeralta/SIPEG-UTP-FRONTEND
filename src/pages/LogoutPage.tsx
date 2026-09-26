import { useQueryClient } from "@tanstack/react-query";
import { Box } from "@chakra-ui/react";
import { useEffect } from "react";
import { useNavigate } from "react-router";

import { clearPersistedQueryCache } from "@/app/query";
import { StatusPanel } from "@/components";
import { useSessionStore } from "@/store/session";
import { useUnitPreferenceStore } from "@/store/unitPreference";
import { useWorkingContextStore } from "@/store/workingContext";

export function LogoutPage() {
  const logout = useSessionStore((state) => state.logout);
  const clearWorkingContext = useWorkingContextStore((state) => state.clearWorkingContext);
  const setSelectedUnitId = useUnitPreferenceStore((state) => state.setSelectedUnitId);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    logout();
    clearWorkingContext();
    setSelectedUnitId("all");
    queryClient.clear();
    clearPersistedQueryCache();
    void navigate("/", { replace: true });
  }, [clearWorkingContext, logout, navigate, queryClient, setSelectedUnitId]);

  return (
    <Box mx="auto" my={{ base: 10, md: 16 }} w="min(100% - 2rem, 32rem)">
      <StatusPanel>Cerrando sesion...</StatusPanel>
    </Box>
  );
}

export default LogoutPage;
