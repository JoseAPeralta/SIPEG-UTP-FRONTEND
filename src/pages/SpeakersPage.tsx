import { Badge, Box, HStack, Text } from "@chakra-ui/react";

import { AsyncStateView, ModuleShell, Surface } from "@/components";
import { activityTypeLabels } from "@/features/activity-catalog";
import { useSpeakersOverview } from "@/features/speakers";
import { formatDateTime } from "@/utils";

export function SpeakersPage() {
  const { error, isLoading, rows } = useSpeakersOverview();

  return (
    <ModuleShell
      description="Registro de propuestas de ponentes con duracion, tipo de charla, resumen y programa asociado."
      headingLabel="Convocatoria"
      title="Registro de ponentes"
    >
      <AsyncStateView error={error} isLoading={isLoading}>
        <Box display="flex" flexDirection="column" gap={4}>
          {rows.map((row) => (
            <Surface
              display="flex"
              flexDirection="column"
              gap={4}
              key={row.proposal.id}
              padding="normal"
            >
              <HStack gap={3} wrap="wrap">
                <Badge colorPalette="terracotta" rounded="full" variant="subtle">
                  {activityTypeLabels[row.proposal.talkType]}
                </Badge>
                <Badge rounded="full" variant="surface">
                  {row.proposal.approximateDuration}
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
                  {row.proposal.proposalTitle}
                </Text>
                <Text color="text.muted" mt={2}>
                  {row.proposal.firstName} {row.proposal.lastName} · {row.proposal.email}
                </Text>
              </Box>
              <Text color="text.default">{row.proposal.content}</Text>
              <Text color="text.muted" fontSize="sm">
                Aplica a: {row.programName ?? "Programa pendiente"} · Enviado{" "}
                {formatDateTime(row.proposal.submittedAt)}
              </Text>
            </Surface>
          ))}
        </Box>
      </AsyncStateView>
    </ModuleShell>
  );
}

export default SpeakersPage;
