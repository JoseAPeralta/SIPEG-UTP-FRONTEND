import { Box, Container, Flex, HStack, Heading, Stack, Text } from "@chakra-ui/react";
import { NavLink, Outlet } from "react-router";

const navigationItems = [
  { label: "Inicio", prefix: "00", to: "/" },
  { label: "Eventos", prefix: "01", to: "/eventos" },
  { label: "Asistencia", prefix: "02", to: "/asistencia" },
  { label: "Certificados", prefix: "03", to: "/certificados" },
  { label: "Aulas", prefix: "04", to: "/aulas" },
  { label: "Ponentes", prefix: "05", to: "/ponentes" },
  { label: "Reportes", prefix: "06", to: "/reportes" },
  { label: "Usuarios", prefix: "07", to: "/usuarios" },
];

export function AppLayout() {
  return (
    <Box bg="surface.canvas" color="text.default" minH="100vh">
      <Box
        background="radial-gradient(circle at top left, rgba(168, 21, 32, 0.18), transparent 32rem), radial-gradient(circle at 85% 10%, rgba(242, 177, 92, 0.2), transparent 28rem)"
        borderBottomColor="border.subtle"
        borderBottomWidth="1px"
        position="sticky"
        top="0"
        zIndex="10"
      >
        <Container maxW="7xl" py={{ base: 4, md: 5 }}>
          <Stack gap={4}>
            <Flex align="center" gap={4} justify="space-between" wrap="wrap">
              <HStack gap={3}>
                <Box
                  bg="accent.solid"
                  color="accent.contrast"
                  fontWeight="900"
                  px={3}
                  py={2}
                  rounded="xl"
                >
                  UTP
                </Box>
                <Box>
                  <Heading
                    as="p"
                    color="text.default"
                    fontFamily="heading"
                    fontSize="2xl"
                    lineHeight="1"
                  >
                    SIPEG
                  </Heading>
                  <Text
                    color="text.muted"
                    fontSize="xs"
                    fontWeight="700"
                    letterSpacing="0.12em"
                    textTransform="uppercase"
                  >
                    Gestion academica de eventos
                  </Text>
                </Box>
              </HStack>
              <Text color="text.muted" fontSize="sm" fontWeight="700">
                Frontend operativo · Panama
              </Text>
            </Flex>
            <Box as="nav" aria-label="Modulos principales" overflowX="auto" pb={1}>
              <HStack as="ul" gap={2} listStyleType="none" minW="max-content">
                {navigationItems.map((item) => (
                  <Box as="li" key={item.to}>
                    <NavLink end={item.to === "/"} style={{ textDecoration: "none" }} to={item.to}>
                      {({ isActive }) => (
                        <HStack
                          bg={isActive ? "accent.solid" : "surface.raised"}
                          borderColor={isActive ? "accent.solid" : "border.subtle"}
                          borderWidth="1px"
                          color={isActive ? "accent.contrast" : "text.default"}
                          gap={2}
                          px={4}
                          py={2.5}
                          rounded="full"
                        >
                          <Text fontSize="xs" fontWeight="900" opacity={0.72}>
                            {item.prefix}
                          </Text>
                          <Text fontSize="sm" fontWeight="800">
                            {item.label}
                          </Text>
                        </HStack>
                      )}
                    </NavLink>
                  </Box>
                ))}
              </HStack>
            </Box>
          </Stack>
        </Container>
      </Box>
      <Container as="main" maxW="7xl" py={{ base: 7, md: 10 }}>
        <Outlet />
      </Container>
    </Box>
  );
}
