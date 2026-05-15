import { Container, Flex } from "@chakra-ui/react";
import { Outlet } from "react-router";

import { AdminMenu } from "@components/Layout/AdminMenu";
import { AppFooter } from "@components/Layout/AppFooter";
import { AppMenu } from "@components/Layout/AppMenu";

export function AdminLayout() {
  return (
    <Flex bg="surface.canvas" color="text.default" direction="column" minH="100vh">
      <AppMenu />
      <AdminMenu />
      <Container as="main" flex="1" maxW="7xl" py={{ base: 7, md: 10 }} w="full">
        <Outlet />
      </Container>
      <AppFooter />
    </Flex>
  );
}
