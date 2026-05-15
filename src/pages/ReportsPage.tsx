import { Box, Button, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";

import { MetricCard } from "@components/MetricCard";
import { ModuleShell } from "@components/ModuleShell";
import { attendanceRecords, certificates, smallEvents } from "@/data/sipeg";
import { useSelectedEventStore } from "@/store/selectedEvent";
import { getRelatedSmallEventIds, getSelectedEventLabel } from "@utils/adminEventSelection";

const tones = ["red", "teal", "amber", "graphite"] as const;

export function ReportsPage() {
  const selectedEventId = useSelectedEventStore((state) => state.selectedEventId);
  const selectedEventLabel = getSelectedEventLabel(selectedEventId);
  const relatedEventIds = getRelatedSmallEventIds(selectedEventId);
  const selectedEvents = smallEvents.filter((event) => relatedEventIds.includes(event.id));
  const selectedAttendanceRecords = attendanceRecords.filter((record) =>
    relatedEventIds.includes(record.eventId),
  );
  const selectedCertificates = certificates.filter((certificate) =>
    relatedEventIds.includes(certificate.eventId),
  );
  const reportMetrics = [
    {
      detail: "Eventos pequenos incluidos",
      id: "metric-events",
      label: "Eventos",
      value: String(selectedEvents.length),
    },
    {
      detail: "Inscripciones registradas",
      id: "metric-attendees",
      label: "Inscritos",
      value: String(selectedEvents.reduce((total, event) => total + event.registeredAttendees, 0)),
    },
    {
      detail: "Asistencias confirmadas",
      id: "metric-attendance",
      label: "Asistencia",
      value: String(selectedAttendanceRecords.filter((record) => record.present).length),
    },
    {
      detail: "Certificados generados",
      id: "metric-certificates",
      label: "Certificados",
      value: String(
        selectedCertificates.filter((certificate) => certificate.status === "generated").length,
      ),
    },
  ];

  if (!selectedEventId) {
    return (
      <ModuleShell
        description="Selecciona un evento de trabajo para consultar estadisticas y exportaciones."
        eyebrow="Analitica"
        title="Reportes y estadisticas"
      >
        <Box bg="surface.raised" borderColor="border.subtle" borderWidth="1px" p={6} rounded="3xl">
          <Text color="text.default" fontFamily="heading" fontSize="3xl" fontWeight="700">
            Selecciona un evento
          </Text>
          <Text color="text.muted" mt={2}>
            Los reportes se calculan solo para el evento elegido en el menu de administracion.
          </Text>
        </Box>
      </ModuleShell>
    );
  }

  return (
    <ModuleShell
      description={`Metricas y exportaciones preparadas para ${selectedEventLabel ?? "el evento seleccionado"}.`}
      eyebrow="Analitica"
      title="Reportes y estadisticas"
      actions={
        <HStack gap={3} wrap="wrap">
          <Button colorPalette="red" rounded="full" variant="solid">
            Exportar Excel
          </Button>
          <Button colorPalette="red" rounded="full" variant="outline">
            Exportar PDF
          </Button>
        </HStack>
      }
    >
      <Stack gap={6}>
        <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} gap={5}>
          {reportMetrics.map((metric, index) => (
            <MetricCard
              detail={metric.detail}
              key={metric.id}
              label={metric.label}
              tone={tones[index] ?? "red"}
              value={metric.value}
            />
          ))}
        </SimpleGrid>
        <Text color="text.muted" fontSize="sm">
          La interfaz mantiene los reportes como datos frontend por ahora; cuando exista backend,
          esta pagina debe consumir una capa de cliente/API aislada y filtrada por evento.
        </Text>
      </Stack>
    </ModuleShell>
  );
}

export default ReportsPage;
