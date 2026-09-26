import { Box, Flex, HStack } from "@chakra-ui/react";
import { NavLink } from "react-router";

import { WorkingContextSelect } from "@/features/working-context";

const menuOptions = [
  { label: "Panel", path: "/admin" },
  { label: "Eventos", path: "/admin/eventos" },
  { label: "Asistencia", path: "/admin/asistencia" },
  { label: "Certificados", path: "/admin/certificados" },
  { label: "Reportes", path: "/admin/reportes" },
] as const;

export function AdminMenu() {
  return (
    <Box
      as="section"
      bg="surface.raised"
      borderBottomColor="border.subtle"
      borderBottomWidth="1px"
      py={4}
    >
      <Flex
        align={{ base: "stretch", md: "end" }}
        gap={{ base: 4, md: 6 }}
        justify="space-between"
        maxW="7xl"
        mx="auto"
        px={{ base: 4, md: 6 }}
        wrap="wrap"
      >
        <Box flex={{ base: "1 1 100%", md: "0 1 420px" }}>
          <WorkingContextSelect />
        </Box>

        <HStack as="nav" aria-label="Navegacion del panel" gap={2} justify="end" wrap="wrap">
          {menuOptions.map((option) => (
            <NavLink end key={option.path} style={{ textDecoration: "none" }} to={option.path}>
              {({ isActive }) => (
                <Box
                  bg={isActive ? "accent.solid" : "transparent"}
                  borderColor={isActive ? "accent.solid" : "border.subtle"}
                  borderWidth="1px"
                  color={isActive ? "accent.contrast" : "text.default"}
                  fontSize="sm"
                  fontWeight="800"
                  px={4}
                  py={2}
                  rounded="full"
                >
                  {option.label}
                </Box>
              )}
            </NavLink>
          ))}
        </HStack>
      </Flex>
    </Box>
  );
}
