import { Button, Heading, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { Link } from "react-router";
import { AsyncStateView, FeedbackState, ModuleShell, Surface } from "@/components";
import { useOperationalAccess } from "../hooks/useOperationalAccess";
import { operationalScopePath, scopeStatusLabels } from "../model/operationalNavigation";

/** Entrada operativa sin catálogo administrativo ni consultas por cada recurso descubierto. */
export function OperationalScopesView() {
  const { scopes, error, isLoading, refetch } = useOperationalAccess();
  return (
    <ModuleShell
      title="Mis operaciones"
      headingLabel="Trabajo autorizado"
      description="Elija un programa o una actividad en los que tenga permisos vigentes."
    >
      <AsyncStateView
        isLoading={isLoading}
        error={error ? new Error("No se pudieron consultar sus contextos de trabajo.") : null}
        onRetry={() => {
          void refetch();
        }}
      >
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
