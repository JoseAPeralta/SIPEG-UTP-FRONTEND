import { Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

import { Surface } from "./Surface";

export type StatusPanelProps = {
  children: ReactNode;
  role?: "alert" | "status" | undefined;
};

/** Announces a short status or alert inside the shared surface treatment. */
export function StatusPanel({ children, role = "status" }: StatusPanelProps) {
  return (
    <Surface padding="normal" role={role}>
      <Text color="text.muted" fontWeight="800">
        {children}
      </Text>
    </Surface>
  );
}
