import { Box, Heading, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

import { Surface, type SurfacePadding } from "./Surface";

export type FeedbackStateProps = {
  action?: ReactNode | undefined;
  description: string;
  padding?: SurfacePadding | undefined;
  role?: "alert" | undefined;
  title: string;
  titleSize?: "md" | "lg" | undefined;
};

/** Presents an empty, blocked or error state with an optional recovery action. */
export function FeedbackState({
  action,
  description,
  padding = "normal",
  role,
  title,
  titleSize = "md",
}: FeedbackStateProps) {
  return (
    <Surface padding={padding} role={role}>
      <Heading
        as="h2"
        color="text.default"
        fontFamily="heading"
        fontSize={titleSize === "lg" ? "3xl" : "2xl"}
        fontWeight="700"
      >
        {title}
      </Heading>
      <Text color="text.muted" mt={2}>
        {description}
      </Text>
      {action ? <Box mt={4}>{action}</Box> : null}
    </Surface>
  );
}
