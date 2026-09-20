import { Container, Flex } from "@chakra-ui/react";
import { Outlet } from "react-router";

import { AppFooter } from "@components/Layout/AppFooter";
import { AppMenu } from "@components/Layout/AppMenu";
import { SkipLink } from "@components/Layout/SkipLink";

export function AppLayout() {
  return (
    <Flex bg="surface.canvas" color="text.default" direction="column" minH="100vh">
      <SkipLink />
      <AppMenu />
      <Container
        as="main"
        flex="1"
        id="main-content"
        maxW="7xl"
        py={{ base: 7, md: 10 }}
        tabIndex={-1}
        w="full"
      >
        <Outlet />
      </Container>
      <AppFooter />
    </Flex>
  );
}
