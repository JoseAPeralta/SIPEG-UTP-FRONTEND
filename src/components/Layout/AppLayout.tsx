import { Container, Flex } from "@chakra-ui/react";
import { Outlet } from "react-router";

import { AppFooter } from "@components/Layout/AppFooter";
import { AppMenu } from "@components/Layout/AppMenu";

export function AppLayout() {
  return (
    <Flex bg="surface.canvas" color="text.default" direction="column" minH="100vh">
      <AppMenu />
      <Container as="main" flex="1" maxW="7xl" py={{ base: 7, md: 10 }} w="full">
        <Outlet />
      </Container>
      <AppFooter />
    </Flex>
  );
}
