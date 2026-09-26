import { Button, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";

import { AsyncStateView, MetricCard, ModuleShell, SelectionRequiredState } from "@/components";
import { useReportsOverview } from "@/features/reports";

const tones = ["primary", "success", "warning", "neutral"] as const;

export function ReportsPage() {
  const { error, isLoading, report, scope } = useReportsOverview();

  if (!isLoading && !error && !scope) {
    return (
      <ModuleShell
        description="Selecciona un contexto de trabajo para consultar estadisticas y exportaciones."
        headingLabel="Analitica"
        title="Reportes y estadisticas"
      >
        <SelectionRequiredState
          message="Los reportes se calculan para el programa o la actividad elegidos en el panel de administracion."
          title="Selecciona un contexto de trabajo"
        />
      </ModuleShell>
    );
  }

  const metrics = report
    ? [
        {
          detail: "Actividades incluidas",
          id: "metric-activities",
          label: "Actividades",
          value: String(report.activities.length),
        },
        {
          detail: "Inscripciones registradas",
          id: "metric-enrolled",
          label: "Inscritos",
          value: String(report.enrolledCount),
        },
        {
          detail: "Asistencias confirmadas",
          id: "metric-attendance",
          label: "Asistencia",
          value: String(report.confirmedAttendanceCount),
        },
        {
          detail: "Certificados generados",
          id: "metric-certificates",
          label: "Certificados",
          value: String(report.generatedCertificatesCount),
        },
      ]
    : [];

  return (
    <ModuleShell
      description={
        scope
          ? `Metricas y exportaciones preparadas para ${scope.label}.`
          : "Metricas y exportaciones del contexto seleccionado."
      }
      headingLabel="Analitica"
      title="Reportes y estadisticas"
      actions={
        <HStack gap={3} wrap="wrap">
          <Button colorPalette="terracotta" rounded="full" variant="solid">
            Exportar Excel
          </Button>
          <Button colorPalette="terracotta" rounded="full" variant="outline">
            Exportar PDF
          </Button>
        </HStack>
      }
    >
      <AsyncStateView error={error} isLoading={isLoading}>
        <Stack gap={6}>
          <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} gap={5}>
            {metrics.map((metric, index) => (
              <MetricCard
                appearance="standard"
                detail={metric.detail}
                key={metric.id}
                label={metric.label}
                tone={tones[index] ?? "primary"}
                value={metric.value}
              />
            ))}
          </SimpleGrid>
          <Text color="text.muted" fontSize="sm">
            Las exportaciones siguen pendientes hasta que el backend publique sus contratos de
            reportes.
          </Text>
        </Stack>
      </AsyncStateView>
    </ModuleShell>
  );
}

export default ReportsPage;
