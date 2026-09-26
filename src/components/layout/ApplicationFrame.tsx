import { Container, Flex } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { Outlet } from "react-router";

import { AppFooter } from "./AppFooter";
import { AppMenu } from "./AppMenu";
import { SkipLink } from "./SkipLink";

type ApplicationFrameProps = {
  navigation?: ReactNode;
};

export function ApplicationFrame({ navigation }: ApplicationFrameProps) {
  return (
    <Flex bg="surface.canvas" color="text.default" direction="column" minH="100vh">
      <SkipLink />
      <AppMenu />
      {navigation}
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
