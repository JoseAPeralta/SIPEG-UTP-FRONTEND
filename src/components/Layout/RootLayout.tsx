import { Box, Button, Container, Flex, HStack, Heading, Text } from "@chakra-ui/react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";

import { useSessionStore } from "@/store/session";

type MenuLinkProps = {
  children: string;
  to: string;
};

function MenuLink({ children, to }: MenuLinkProps) {
  return (
    <NavLink style={{ textDecoration: "none" }} to={to}>
      {({ isActive }) => (
        <Box
          bg={isActive ? "accent.solid" : "surface.raised"}
          borderColor={isActive ? "accent.solid" : "border.subtle"}
          borderWidth="1px"
          color={isActive ? "accent.contrast" : "text.default"}
          fontSize="sm"
          fontWeight="800"
          px={4}
          py={2.5}
          rounded="full"
        >
          {children}
        </Box>
      )}
    </NavLink>
  );
}

function Header() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const navigate = useNavigate();

  const handleLogout = () => {
    void navigate("/logout", { replace: true });
  };

  return (
    <Box
      as="header"
      background="radial-gradient(circle at top left, rgba(168, 21, 32, 0.16), transparent 28rem), rgba(248, 241, 231, 0.86)"
      borderBottomColor="border.subtle"
      borderBottomWidth="1px"
      position="sticky"
      top="0"
      zIndex="10"
    >
      <Container maxW="7xl" py={{ base: 4, md: 5 }}>
        <Flex align="center" gap={{ base: 3, md: 5 }} justify="start" wrap="wrap">
          <Link style={{ textDecoration: "none" }} to="/">
            <Heading
              as="p"
              color="text.default"
              fontFamily="heading"
              fontSize="2xl"
              lineHeight="1"
            >
              SIPEG
            </Heading>
          </Link>
          <HStack as="nav" aria-label="Navegacion principal" gap={2} wrap="wrap">
            {currentUser ? (
              <>
                <MenuLink to="/dashboard">Panel de administracion</MenuLink>
                <Button colorPalette="red" onClick={handleLogout} rounded="full" variant="outline">
                  Cerrar sesion
                </Button>
              </>
            ) : (
              <MenuLink to="/login">Iniciar sesion</MenuLink>
            )}
          </HStack>
        </Flex>
      </Container>
    </Box>
  );
}

function Footer() {
  return (
    <Box as="footer" borderTopColor="border.subtle" borderTopWidth="1px" mt="auto">
      <Container maxW="7xl" py={{ base: 6, md: 7 }}>
        <Flex align="center" gap={3} justify="space-between" wrap="wrap">
          <Text color="text.default" fontFamily="heading" fontSize="xl" fontWeight="700">
            SIPEG
          </Text>
          <Text color="text.muted" fontSize="sm" fontWeight="700">
            Gestion academica de eventos UTP · Centro Regional de Veraguas
          </Text>
        </Flex>
      </Container>
    </Box>
  );
}

export function RootLayout() {
  return (
    <Flex bg="surface.canvas" color="text.default" direction="column" minH="100vh">
      <Header />
      <Box flex="1">
        <Outlet />
      </Box>
      <Footer />
    </Flex>
  );
}
