import { Button, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";

import {
  AsyncStateView,
  MetricCard,
  ModuleShell,
  SectionHeader,
  StatusPanel,
  Surface,
} from "@/components";
import { ActivityCard } from "@/features/activity-catalog";
import { useDashboardOverview } from "@/features/dashboard";

export function DashboardPage() {
  const dashboard = useDashboardOverview();
  const operationalValue = (value: number) => (dashboard.operationsError ? "—" : String(value));

  return (
    <ModuleShell
      description="Una consola editorial para priorizar actividades por unidad organizativa, preparar asistencia, revisar certificados y anticipar reportes."
      headingLabel="Operacion academica"
      title="Panel operativo SIPEG"
    >
      <AsyncStateView error={dashboard.error} isLoading={dashboard.isLoading}>
        <Stack gap={8}>
          <Surface padding="normal">
            <Text
              color="text.muted"
              fontSize="sm"
              fontWeight="800"
              letterSpacing="0.1em"
              textTransform="uppercase"
            >
              Prioridad por unidad organizativa
            </Text>
            <HStack gap={3} mt={4} overflowX="auto" pb={1} wrap={{ base: "nowrap", md: "wrap" }}>
              <Button
                colorPalette="terracotta"
                onClick={() => dashboard.onUnitChange("all")}
                rounded="full"
                size="sm"
                variant={dashboard.selectedUnitId === "all" ? "solid" : "outline"}
              >
                Todas
              </Button>
              {dashboard.unitOptions.map((option) => (
                <Button
                  colorPalette="terracotta"
                  key={option.id}
                  onClick={() => dashboard.onUnitChange(option.id)}
                  rounded="full"
                  size="sm"
                  variant={dashboard.selectedUnitId === option.id ? "solid" : "outline"}
                >
                  {option.label.split(" - ")[0]}
                </Button>
              ))}
            </HStack>
          </Surface>

          <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} gap={5}>
            <MetricCard
              appearance="standard"
              detail="Actividades visibles con el filtro actual"
              label="Actividades"
              tone="primary"
              value={String(dashboard.visibleActivityCount)}
            />
            <MetricCard
              appearance="standard"
              detail="Registros confirmados en QR o codigo"
              label="Asistencia"
              tone="success"
              value={operationalValue(dashboard.confirmedAttendanceCount)}
            />
            <MetricCard
              appearance="standard"
              detail="Certificados generados desde asistencia"
              label="Certificados"
              tone="warning"
              value={operationalValue(dashboard.generatedCertificatesCount)}
            />
            <MetricCard
              appearance="standard"
              detail="Capacidad maxima inventariada"
              label="Aulas"
              tone="neutral"
              value={String(dashboard.totalCapacity)}
            />
          </SimpleGrid>

          {dashboard.operationsError ? (
            <StatusPanel role="alert">
              Las metricas de asistencia y certificados no estan disponibles mientras el backend
              publique sus contratos. El catalogo y las aulas siguen operativos.
            </StatusPanel>
          ) : null}

          <Stack gap={4}>
            <SectionHeader title="Proximas actividades priorizadas" />
            <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={5}>
              {dashboard.recentRows.map((row) => (
                <ActivityCard
                  activity={row.activity}
                  classroom={row.classroom}
                  key={row.activity.id}
                  program={row.program}
                  showEnrolledCount
                  unit={row.unit}
                />
              ))}
            </SimpleGrid>
          </Stack>
        </Stack>
      </AsyncStateView>
    </ModuleShell>
  );
}

export default DashboardPage;
