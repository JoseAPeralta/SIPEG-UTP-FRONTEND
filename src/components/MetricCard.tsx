import { Box, HStack, Text } from "@chakra-ui/react";

const toneStyles = {
  amber: { accent: "#b46715", bg: "rgba(180, 103, 21, 0.12)" },
  graphite: { accent: "#3c3030", bg: "rgba(60, 48, 48, 0.10)" },
  red: { accent: "#a81520", bg: "rgba(168, 21, 32, 0.12)" },
  teal: { accent: "#0f766e", bg: "rgba(15, 118, 110, 0.12)" },
} as const;

type MetricCardProps = {
  detail: string;
  label: string;
  tone: keyof typeof toneStyles;
  value: string;
};

export function MetricCard({ detail, label, tone, value }: MetricCardProps) {
  const toneStyle = toneStyles[tone];

  return (
    <Box
      bg="surface.raised"
      borderColor="border.subtle"
      borderWidth="1px"
      boxShadow="0 24px 70px rgba(62, 32, 18, 0.09)"
      p={{ base: 5, md: 6 }}
      rounded="3xl"
    >
      <HStack align="start" gap={4} justify="space-between">
        <Box>
          <Text
            color="text.muted"
            fontSize="sm"
            fontWeight="700"
            letterSpacing="0.08em"
            textTransform="uppercase"
          >
            {label}
          </Text>
          <Text
            color="text.default"
            fontFamily="heading"
            fontSize={{ base: "4xl", md: "5xl" }}
            fontWeight="700"
            lineHeight="1"
          >
            {value}
          </Text>
        </Box>
        <Box aria-hidden="true" bg={toneStyle.bg} h="44px" rounded="full" w="44px">
          <Box bg={toneStyle.accent} h="14px" ml="15px" mt="15px" rounded="full" w="14px" />
        </Box>
      </HStack>
      <Text color="text.muted" fontSize="sm" mt={4}>
        {detail}
      </Text>
    </Box>
  );
}
