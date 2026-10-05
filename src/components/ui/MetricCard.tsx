import { Box, HStack, Text } from "@chakra-ui/react";

import { Surface } from "./Surface";

const toneStyles = {
  primary: { accent: "#9C3A1E", bg: "rgba(156, 58, 30, 0.12)" },
  neutral: { accent: "#3C3129", bg: "rgba(60, 49, 41, 0.10)" },
  success: { accent: "#2F6B3A", bg: "rgba(47, 107, 58, 0.12)" },
  warning: { accent: "#B46715", bg: "rgba(180, 103, 21, 0.12)" },
} as const;

export type MetricCardProps = {
  appearance: "operational" | "standard" | "summary";
  detail: string;
  label: string;
  tone?: keyof typeof toneStyles;
  value: string;
};

/** Displays one metric using the standard, operational or summary visual hierarchy. */
export function MetricCard(props: MetricCardProps) {
  if (props.appearance === "operational") {
    const { detail, label, value } = props;

    return (
      <Surface padding="normal">
        <Text color="text.muted" fontWeight="800" letterSpacing="0.1em" textTransform="uppercase">
          {label}
        </Text>
        <Text color="text.default" fontFamily="heading" fontSize="6xl" fontWeight="700">
          {value}
        </Text>
        <Text color="text.muted">{detail}</Text>
      </Surface>
    );
  }

  if (props.appearance === "summary") {
    const { detail, label, value } = props;

    return (
      <Surface elevation="raised" padding="normal">
        <Text color="accent.solid" fontFamily="heading" fontSize="4xl" fontWeight="700">
          {value} {label}
        </Text>
        <Text color="text.muted" fontSize="sm" mt={2}>
          {detail}
        </Text>
      </Surface>
    );
  }

  const { detail, label, tone = "neutral", value } = props;
  const toneStyle = toneStyles[tone];

  return (
    <Surface elevation="raised" padding="normal">
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
    </Surface>
  );
}
