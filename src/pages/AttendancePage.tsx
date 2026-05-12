import { Badge, Box, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";

import { ModuleShell } from "@components/ModuleShell";
import { attendanceRecords, smallEvents } from "@/data/sipeg";

export function AttendancePage() {
  const presentRecords = attendanceRecords.filter((record) => record.present);
  const qrRecords = attendanceRecords.filter((record) => record.method === "qr");

  return (
    <ModuleShell
      description="Modulo preparado para registrar asistencia por QR o codigo manual, con trazabilidad por evento y soporte para listas futuras desde API."
      eyebrow="Control de entrada"
      title="Asistencia"
    >
      <SimpleGrid columns={{ base: 1, lg: 3 }} gap={5}>
        <Box bg="surface.raised" borderColor="border.subtle" borderWidth="1px" p={6} rounded="3xl">
          <Text color="text.muted" fontWeight="800" letterSpacing="0.1em" textTransform="uppercase">
            Confirmados
          </Text>
          <Text color="text.default" fontFamily="heading" fontSize="6xl" fontWeight="700">
            {presentRecords.length}
          </Text>
          <Text color="text.muted">Registros presentes en los eventos cargados.</Text>
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
        >
          {smallEvents.map((event) => (
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
