import { Badge, Box, HStack, SimpleGrid, Text } from "@chakra-ui/react";

import {
  AsyncStateView,
  MetricCard,
  ModuleShell,
  SelectionRequiredState,
  Surface,
} from "@/components";
import { activityStatusLabels } from "@/features/activity-catalog";
import { useAttendanceOverview } from "@/features/attendance";

export function AttendancePage() {
  const { activities, error, isLoading, presentCount, qrCount, records, scope } =
    useAttendanceOverview();

  if (!isLoading && !error && !scope) {
    return (
      <ModuleShell
        description="Selecciona un contexto de trabajo para revisar registros por QR o codigo manual."
        headingLabel="Control de entrada"
        title="Asistencia"
      >
        <SelectionRequiredState
          message="La asistencia se muestra para el programa o la actividad elegidos en el panel de administracion."
          title="Selecciona un contexto de trabajo"
        />
      </ModuleShell>
    );
  }

  return (
    <ModuleShell
      description={
        scope
          ? `Registros de asistencia asociados a ${scope.label}.`
          : "Registros de asistencia del contexto seleccionado."
      }
      headingLabel="Control de entrada"
      title="Asistencia"
    >
      <AsyncStateView error={error} isLoading={isLoading}>
        <SimpleGrid columns={{ base: 1, lg: 3 }} gap={5}>
          <MetricCard
            appearance="operational"
            detail="Registros asociados al contexto seleccionado."
            label="Registros"
            value={String(records.length)}
          />
          <MetricCard
            appearance="operational"
            detail="Asistencias marcadas como presentes."
            label="Confirmados"
            value={String(presentCount)}
          />
          <MetricCard
            appearance="operational"
            detail="Registros capturados mediante codigo QR."
            label="Capturas QR"
            value={String(qrCount)}
          />
          <Surface
            display="flex"
            flexDirection="column"
            gap={4}
            gridColumn={{ base: "auto", lg: "span 3" }}
            padding="normal"
          >
            {activities.map((activity) => (
              <HStack gap={4} justify="space-between" key={activity.id}>
                <Box>
                  <Text color="text.default" fontWeight="800">
                    {activity.name}
                  </Text>
                  <Text color="text.muted" fontSize="sm">
                    {activity.enrolledCount} inscritos · {activity.date} {activity.startTime}
                  </Text>
                </Box>
                <Badge colorPalette="success" rounded="full" variant="subtle">
                  {activityStatusLabels[activity.status]}
                </Badge>
              </HStack>
            ))}
          </Surface>
        </SimpleGrid>
      </AsyncStateView>
    </ModuleShell>
  );
}

export default AttendancePage;
