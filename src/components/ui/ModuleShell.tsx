import { Box, Heading, HStack, Stack, Text } from "@chakra-ui/react";
import type { ReactNode, Ref } from "react";

export type ModuleShellProps = {
  actions?: ReactNode;
  children: ReactNode;
  description: string;
  headingLabel: string;
  /**
   * Receives the route-level `h1` so a layout can move focus to the destination heading after a
   * navigation. Omit it when nothing outside the shell focuses the heading.
   */
  headingRef?: Ref<HTMLHeadingElement>;
  title: string;
};

/** Provides the shared heading, description and action area for route-level modules. */
export function ModuleShell({
  actions,
  children,
  description,
  headingLabel,
  headingRef,
  title,
}: ModuleShellProps) {
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
            {headingLabel}
          </Text>
          <Heading
            as="h1"
            color="text.default"
            fontFamily="heading"
            fontSize={{ base: "4xl", md: "6xl" }}
            lineHeight="0.96"
            mt={2}
            ref={headingRef}
            tabIndex={-1}
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
