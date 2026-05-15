import { Badge, Box, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";

import { ModuleShell } from "@components/ModuleShell";
import { attendanceRecords, smallEvents } from "@/data/sipeg";
import { useSelectedEventStore } from "@/store/selectedEvent";
import { getRelatedSmallEventIds, getSelectedEventLabel } from "@utils/adminEventSelection";

export function AttendancePage() {
  const selectedEventId = useSelectedEventStore((state) => state.selectedEventId);
  const selectedEventLabel = getSelectedEventLabel(selectedEventId);
  const relatedEventIds = getRelatedSmallEventIds(selectedEventId);
  const selectedEvents = smallEvents.filter((event) => relatedEventIds.includes(event.id));
  const selectedRecords = attendanceRecords.filter((record) =>
    relatedEventIds.includes(record.eventId),
  );
  const presentRecords = selectedRecords.filter((record) => record.present);
  const qrRecords = selectedRecords.filter((record) => record.method === "qr");

  if (!selectedEventId) {
    return (
      <ModuleShell
        description="Selecciona un evento de trabajo para revisar registros por QR o codigo manual."
        eyebrow="Control de entrada"
        title="Asistencia"
      >
        <Box bg="surface.raised" borderColor="border.subtle" borderWidth="1px" p={6} rounded="3xl">
          <Text color="text.default" fontFamily="heading" fontSize="3xl" fontWeight="700">
            Selecciona un evento
          </Text>
          <Text color="text.muted" mt={2}>
            La asistencia se muestra solo para el evento elegido en el menu de administracion.
          </Text>
        </Box>
      </ModuleShell>
    );
  }

  return (
    <ModuleShell
      description={`Registros de asistencia asociados a ${selectedEventLabel ?? "el evento seleccionado"}.`}
      eyebrow="Control de entrada"
      title="Asistencia"
    >
      <SimpleGrid columns={{ base: 1, lg: 3 }} gap={5}>
        <Box bg="surface.raised" borderColor="border.subtle" borderWidth="1px" p={6} rounded="3xl">
          <Text color="text.muted" fontWeight="800" letterSpacing="0.1em" textTransform="uppercase">
            Registros
          </Text>
          <Text color="text.default" fontFamily="heading" fontSize="6xl" fontWeight="700">
            {selectedRecords.length}
          </Text>
          <Text color="text.muted">Registros asociados al evento seleccionado.</Text>
        </Box>
        <Box bg="surface.raised" borderColor="border.subtle" borderWidth="1px" p={6} rounded="3xl">
          <Text color="text.muted" fontWeight="800" letterSpacing="0.1em" textTransform="uppercase">
            Confirmados
          </Text>
          <Text color="text.default" fontFamily="heading" fontSize="6xl" fontWeight="700">
            {presentRecords.length}
          </Text>
          <Text color="text.muted">Asistencias marcadas como presentes.</Text>
        </Box>
        <Box bg="surface.raised" borderColor="border.subtle" borderWidth="1px" p={6} rounded="3xl">
          <Text color="text.muted" fontWeight="800" letterSpacing="0.1em" textTransform="uppercase">
            QR activos
          </Text>
          <Text color="text.default" fontFamily="heading" fontSize="6xl" fontWeight="700">
            {qrRecords.length}
          </Text>
          <Text color="text.muted">Capturas listas para validacion automatizada.</Text>
        </Box>
        <Stack
          bg="surface.raised"
          borderColor="border.subtle"
          borderWidth="1px"
          gap={4}
          p={6}
          rounded="3xl"
          gridColumn={{ base: "auto", lg: "span 3" }}
        >
          {selectedEvents.map((event) => (
            <HStack gap={4} justify="space-between" key={event.id}>
              <Box>
                <Text color="text.default" fontWeight="800">
                  {event.name}
                </Text>
                <Text color="text.muted" fontSize="sm">
                  {event.registeredAttendees} inscritos
                </Text>
              </Box>
              <Badge colorPalette="green" rounded="full" variant="subtle">
                Activo
              </Badge>
            </HStack>
          ))}
        </Stack>
      </SimpleGrid>
    </ModuleShell>
  );
}

export default AttendancePage;
