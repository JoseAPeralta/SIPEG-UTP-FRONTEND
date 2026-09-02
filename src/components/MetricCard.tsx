import { Box, HStack, Text } from "@chakra-ui/react";

const toneStyles = {
  primary: { accent: "#9C3A1E", bg: "rgba(156, 58, 30, 0.12)" },
  neutral: { accent: "#3C3129", bg: "rgba(60, 49, 41, 0.10)" },
  success: { accent: "#2F6B3A", bg: "rgba(47, 107, 58, 0.12)" },
  warning: { accent: "#B46715", bg: "rgba(180, 103, 21, 0.12)" },
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
