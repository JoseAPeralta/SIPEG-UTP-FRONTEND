import { Box, Button, Container, Flex, HStack, Heading } from "@chakra-ui/react";
import { Link, NavLink, useNavigate } from "react-router";

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

export function AppMenu() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const navigate = useNavigate();

  const handleLogout = () => {
    void navigate("/logout", { replace: true });
  };

  return (
    <Box
      as="header"
      background="radial-gradient(circle at top left, rgba(156, 58, 30, 0.16), transparent 28rem), rgba(251, 247, 242, 0.86)"
      borderBottomColor="border.subtle"
      borderBottomWidth="1px"
    >
      <Container maxW="7xl" py={{ base: 4, md: 5 }}>
        <Flex align="center" gap={{ base: 3, md: 5 }} justify="space-between" w="full" wrap="wrap">
          <Link style={{ textDecoration: "none" }} to="/">
            <Heading as="p" color="text.default" fontFamily="heading" fontSize="2xl" lineHeight="1">
              SIPEG
            </Heading>
          </Link>
          <HStack
            as="nav"
            aria-label="Navegacion principal"
            gap={2}
            justify="end"
            ml="auto"
            wrap="wrap"
          >
            {currentUser ? (
              <>
                <MenuLink to="/admin">Panel de administracion</MenuLink>
                <Button
                  colorPalette="terracotta"
                  onClick={handleLogout}
                  rounded="full"
                  variant="outline"
                >
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
