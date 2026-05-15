import { Badge, Box, HStack, Stack, Text } from "@chakra-ui/react";

import { ModuleShell } from "@components/ModuleShell";
import { certificates, smallEvents, users } from "@/data/sipeg";
import { useSelectedEventStore } from "@/store/selectedEvent";
import { getRelatedSmallEventIds, getSelectedEventLabel } from "@utils/adminEventSelection";

export function CertificatesPage() {
  const selectedEventId = useSelectedEventStore((state) => state.selectedEventId);
  const selectedEventLabel = getSelectedEventLabel(selectedEventId);
  const relatedEventIds = getRelatedSmallEventIds(selectedEventId);
  const selectedCertificates = certificates.filter((certificate) =>
    relatedEventIds.includes(certificate.eventId),
  );

  if (!selectedEventId) {
    return (
      <ModuleShell
        description="Selecciona un evento de trabajo para consultar certificados generados o pendientes."
        eyebrow="Evidencia academica"
        title="Certificados"
      >
        <Box bg="surface.raised" borderColor="border.subtle" borderWidth="1px" p={6} rounded="3xl">
          <Text color="text.default" fontFamily="heading" fontSize="3xl" fontWeight="700">
            Selecciona un evento
          </Text>
          <Text color="text.muted" mt={2}>
            Los certificados se muestran solo para el evento elegido en el menu de administracion.
          </Text>
        </Box>
      </ModuleShell>
    );
  }

  return (
    <ModuleShell
      description={`Certificados asociados a ${selectedEventLabel ?? "el evento seleccionado"}.`}
      eyebrow="Evidencia academica"
      title="Certificados"
    >
      <Stack gap={4}>
        {selectedCertificates.length === 0 ? (
          <Box
            bg="surface.raised"
            borderColor="border.subtle"
            borderWidth="1px"
            p={6}
            rounded="3xl"
          >
            <Text color="text.default" fontFamily="heading" fontSize="2xl" fontWeight="700">
              No hay certificados para este evento
            </Text>
            <Text color="text.muted" mt={2}>
              Cuando haya asistencia confirmada, los certificados del evento apareceran aqui.
            </Text>
          </Box>
        ) : null}

        {selectedCertificates.map((certificate) => {
          const event = smallEvents.find((smallEvent) => smallEvent.id === certificate.eventId);
          const user = users.find((candidate) => candidate.id === certificate.userId);

          return (
            <HStack
              align="start"
              bg="surface.raised"
              borderColor="border.subtle"
              borderWidth="1px"
              gap={5}
              justify="space-between"
              key={certificate.id}
              p={5}
              rounded="3xl"
              wrap="wrap"
            >
              <Box>
                <Text color="text.default" fontFamily="heading" fontSize="2xl" fontWeight="700">
                  {event?.name ?? "Evento sin asignar"}
                </Text>
                <Text color="text.muted">
                  {user?.fullName ?? "Usuario pendiente"} ·{" "}
                  {new Date(certificate.generatedAt).toLocaleDateString("es-PA")}
                </Text>
              </Box>
              <Badge
                colorPalette={certificate.status === "generated" ? "green" : "orange"}
                rounded="full"
                variant="subtle"
              >
                {certificate.status === "generated" ? "Generado" : "Pendiente"}
              </Badge>
            </HStack>
          );
        })}
      </Stack>
    </ModuleShell>
  );
}

export default CertificatesPage;
