import { Badge, Box, HStack, Stack, Text } from "@chakra-ui/react";

import { ModuleShell } from "@components/ModuleShell";
import { smallEvents, speakerProposals } from "@/data/sipeg";

export function SpeakersPage() {
  return (
    <ModuleShell
      description="Registro de propuestas de ponentes con duracion, tipo de charla, resumen y evento asociado; listo para conectar envio opcional por correo en una capa aparte."
      eyebrow="Convocatoria"
      title="Registro de ponentes"
    >
      <Stack gap={4}>
        {speakerProposals.map((proposal) => {
          const event = smallEvents.find((smallEvent) => smallEvent.id === proposal.eventId);

          return (
            <Stack
              bg="surface.raised"
              borderColor="border.subtle"
              borderWidth="1px"
              gap={4}
              key={proposal.id}
              p={6}
              rounded="3xl"
            >
              <HStack gap={3} wrap="wrap">
                <Badge colorPalette="terracotta" rounded="full" variant="subtle">
                  {proposal.talkType}
                </Badge>
                <Badge rounded="full" variant="surface">
                  {proposal.approximateDuration}
                </Badge>
              </HStack>
              <Box>
                <Text
                  color="text.default"
                  fontFamily="heading"
                  fontSize="3xl"
                  fontWeight="700"
                  lineHeight="1.06"
                >
                  {proposal.proposalTitle}
                </Text>
                <Text color="text.muted" mt={2}>
                  {proposal.firstName} {proposal.lastName} · {proposal.email}
                </Text>
              </Box>
              <Text color="text.default">{proposal.content}</Text>
              <Text color="text.muted" fontSize="sm">
                Aplica a: {event?.name ?? "Evento pendiente"} · Enviado {proposal.submittedAt}
              </Text>
            </Stack>
          );
        })}
      </Stack>
    </ModuleShell>
  );
}

export default SpeakersPage;
