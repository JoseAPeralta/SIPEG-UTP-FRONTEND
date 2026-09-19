import { Badge, Box, HStack, Stack, Text } from "@chakra-ui/react";

import { ModuleShell } from "@components/ModuleShell";
import { certificates, smallEvents, users } from "@/data/sipeg";

export function CertificatesPage() {
  return (
    <ModuleShell
      description="Vista para preparar certificados automaticos o generados desde listas de asistencia, manteniendo la logica de emision fuera de los componentes."
      eyebrow="Evidencia academica"
      title="Certificados"
    >
      <Stack gap={4}>
        {certificates.map((certificate) => {
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
