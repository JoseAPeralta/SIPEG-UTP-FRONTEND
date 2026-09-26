import { Box, Heading, Text } from "@chakra-ui/react";

export type SectionHeaderProps = {
  description?: string | undefined;
  headingLabel?: string | undefined;
  id?: string | undefined;
  status?: string | undefined;
  title: string;
};

/** Introduces a section below the route-level heading supplied by ModuleShell. */
export function SectionHeader({
  description,
  headingLabel,
  id,
  status,
  title,
}: SectionHeaderProps) {
  return (
    <Box>
      {headingLabel ? (
        <Text
          color="text.muted"
          fontSize="sm"
          fontWeight="800"
          letterSpacing="0.1em"
          textTransform="uppercase"
        >
          {headingLabel}
        </Text>
      ) : null}
      <Heading
        as="h2"
        color="text.default"
        fontFamily="heading"
        fontSize={{ base: "3xl", md: "4xl" }}
        id={id}
      >
        {title}
      </Heading>
      {description ? (
        <Text color="text.muted" fontWeight="700" mt={2}>
          {description}
        </Text>
      ) : null}
      {status ? (
        <Text color="text.muted" fontWeight="700" mt={2} role="status">
          {status}
        </Text>
      ) : null}
    </Box>
  );
}
