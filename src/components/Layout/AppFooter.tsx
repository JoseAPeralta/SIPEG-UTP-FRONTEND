import { Box, Container, Flex, Text } from "@chakra-ui/react";

export function AppFooter() {
  return (
    <Box as="footer" borderTopColor="border.subtle" borderTopWidth="1px" mt="auto">
      <Container maxW="7xl" py={{ base: 6, md: 7 }}>
        <Flex align="center" gap={3} justify="space-between" wrap="wrap">
          <Text color="text.default" fontFamily="heading" fontSize="xl" fontWeight="700">
            SIPEG
          </Text>
          <Text color="text.muted" fontSize="sm" fontWeight="700">
            Gestion de eventos academicos y asistencia
          </Text>
        </Flex>
      </Container>
    </Box>
  );
}
