import { Container } from "@chakra-ui/react";
import { Outlet } from "react-router";

export function AppLayout() {
  return (
    <Container as="main" maxW="7xl" py={{ base: 7, md: 10 }}>
      <Outlet />
    </Container>
  );
}
