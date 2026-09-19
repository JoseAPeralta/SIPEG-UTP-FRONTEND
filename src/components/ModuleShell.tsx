import { Box, Heading, HStack, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

type ModuleShellProps = {
  actions?: ReactNode;
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
};

export function ModuleShell({ actions, children, description, eyebrow, title }: ModuleShellProps) {
  return (
    <Stack gap={{ base: 6, md: 8 }}>
      <HStack align={{ base: "start", md: "end" }} gap={5} justify="space-between" wrap="wrap">
        <Box maxW="760px">
          <Text
            color="accent.solid"
            fontSize="sm"
            fontWeight="800"
            letterSpacing="0.14em"
            textTransform="uppercase"
          >
            {eyebrow}
          </Text>
          <Heading
            as="h1"
            color="text.default"
            fontFamily="heading"
            fontSize={{ base: "4xl", md: "6xl" }}
            lineHeight="0.96"
            mt={2}
          >
            {title}
          </Heading>
          <Text color="text.muted" fontSize={{ base: "md", md: "lg" }} lineHeight="1.7" mt={4}>
            {description}
          </Text>
        </Box>
        {actions ? <Box>{actions}</Box> : null}
      </HStack>
      {children}
    </Stack>
  );
}
