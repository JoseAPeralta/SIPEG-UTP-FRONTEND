import { Box, Button, Container, Flex, HStack, Heading, Skeleton } from "@chakra-ui/react";
import { Link, NavLink, useNavigate } from "react-router";
import { lazy, Suspense } from "react";

import { useSessionStore } from "@/store/session";

const UnreadAlertsIndicator = lazy(() =>
  import("@/features/alerts/navigation").then(({ UnreadAlertsIndicator: Component }) => ({
    default: Component,
  })),
);

const OperationalMenuLink = lazy(() =>
  import("@/features/collaboration/navigation").then(({ OperationalMenuLink: Component }) => ({
    default: Component,
  })),
);

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

function SkeletonCircle() {
  return (
    <Skeleton
      aria-hidden="true"
      data-testid="session-restoring-placeholder"
      height="40px"
      rounded="full"
      width="180px"
    />
  );
}

export function AppMenu() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const status = useSessionStore((state) => state.status);
  const navigate = useNavigate();

  const handleLogout = () => {
    void navigate("/logout", { replace: true });
  };

  // Mientras se restaura la sesion no se sabe si hay usuario. Mostrar "Iniciar
  // sesion" y cambiarlo despueseria un parpadeo visible en cada carga, asi que se
  // reserva el hueco con un esqueleto de la misma forma.
  const isRestoring = status === "restoring";

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
            {isRestoring ? (
              <SkeletonCircle />
            ) : currentUser ? (
              <>
                {currentUser.globalRole === "ADMIN" ? (
                  <MenuLink to="/admin">Panel de administracion</MenuLink>
                ) : null}
                <MenuLink to="/perfil">Mi perfil</MenuLink>
                <Suspense fallback={null}>
                  <UnreadAlertsIndicator />
                </Suspense>
                <Suspense fallback={null}>
                  <OperationalMenuLink />
                </Suspense>
                <Button
                  colorPalette="terracotta"
                  onClick={handleLogout}
                  rounded="full"
                  variant="outline"
                >
                  Cerrar sesión
                </Button>
              </>
            ) : (
              <>
                <MenuLink to="/login">Iniciar sesión</MenuLink>
                <MenuLink to="/registro">Registrarse</MenuLink>
              </>
            )}
          </HStack>
        </Flex>
      </Container>
    </Box>
  );
}
