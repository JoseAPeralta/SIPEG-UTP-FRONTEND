import { Button, Heading, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router";
import { AsyncStateView, FeedbackState, ModuleShell, StatusPanel, Surface } from "@/components";
import { readActivityDeletionNotice } from "@/features/activity-catalog";
import { useOperationalAccess } from "../hooks/useOperationalAccess";
import { operationalScopePath, scopeStatusLabels } from "../model/operationalNavigation";

/** Aviso de contexto retirado transportado como estado de navegación; se conserva al releer. */
function readContextLost(state: unknown): string | null {
  if (typeof state !== "object" || state === null) return null;
  const value = (state as { contextLost?: unknown }).contextLost;
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Entrada operativa sin catálogo administrativo ni consultas por cada recurso descubierto. */
export function OperationalScopesView() {
  const { scopes, error, isLoading, refetch } = useOperationalAccess();
  const locationState: unknown = useLocation().state;
  const contextLost = readContextLost(locationState);
  const deletionNotice = readActivityDeletionNotice(locationState);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!deletionNotice) return;

    headingRef.current?.focus();
  }, [deletionNotice]);

  return (
    <ModuleShell
      description="Elija un programa o una actividad en los que tenga permisos vigentes."
      headingLabel="Trabajo autorizado"
      headingRef={headingRef}
      title="Mis operaciones"
    >
      <AsyncStateView
        isLoading={isLoading}
        error={error ? new Error("No se pudieron consultar sus contextos de trabajo.") : null}
        onRetry={() => {
          void refetch();
        }}
      >
        {deletionNotice ? <StatusPanel>{deletionNotice}</StatusPanel> : null}
        {contextLost ? (
          <StatusPanel>
            El contexto «{contextLost}» ya no está disponible. Se retiró la selección.
          </StatusPanel>
        ) : null}
        {!scopes.length ? (
          <FeedbackState
            title="Sin contextos de trabajo"
            description="No tiene permisos operativos vigentes. Puede seguir usando su área personal."
            action={<Link to="/perfil">Ir a mi perfil</Link>}
          />
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={5}>
            {scopes.map((scope) => (
              <Surface key={`${scope.type}:${scope.id}`} padding="normal">
                <Stack gap={3}>
                  <Text fontSize="sm" color="text.muted">
                    {scope.type === "program" ? "Programa de eventos" : "Actividad"} ·{" "}
                    {scopeStatusLabels[scope.status]}
                  </Text>
                  <Heading as="h2" size="lg">
                    {scope.name}
                  </Heading>
                  <Text>{scope.organizationalUnit.name}</Text>
                  {scope.eventProgram ? (
                    <Text fontSize="sm">Programa: {scope.eventProgram.name}</Text>
                  ) : null}
                  <Button asChild minH="44px" colorPalette="terracotta">
                    <Link to={operationalScopePath(scope)}>Abrir {scope.name}</Link>
                  </Button>
                </Stack>
              </Surface>
            ))}
          </SimpleGrid>
        )}
      </AsyncStateView>
    </ModuleShell>
  );
}
