import { Button } from "@chakra-ui/react";
import type { ReactNode } from "react";

import { FeedbackState } from "./FeedbackState";
import { StatusPanel } from "./StatusPanel";

export type AsyncStateViewProps = {
  children: ReactNode;
  error: Error | null;
  isLoading: boolean;
  onRetry?: (() => void) | undefined;
};

/** Resolves loading, error and ready states in that precedence order. */
export function AsyncStateView({ children, error, isLoading, onRetry }: AsyncStateViewProps) {
  if (isLoading) {
    return <StatusPanel>Cargando informacion...</StatusPanel>;
  }

  if (error) {
    return (
      <FeedbackState
        action={
          onRetry ? (
            <Button colorPalette="terracotta" onClick={onRetry} rounded="full" variant="outline">
              Reintentar
            </Button>
          ) : undefined
        }
        description={error.message}
        role="alert"
        title="No se pudo cargar la informacion"
      />
    );
  }

  return <>{children}</>;
}
