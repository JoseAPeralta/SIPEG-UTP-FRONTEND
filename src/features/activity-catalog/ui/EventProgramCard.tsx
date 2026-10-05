import { Badge, Box, Button, HStack, Stack, Text } from "@chakra-ui/react";

import { Surface } from "@/components";
import { getUnitColorKey } from "@theme/index";
import type { EventProgram } from "@/types/domain";
import { formatProgramDateRange } from "@/utils/dateFormatting";

import { getProgramBadgeLabel, type ProgramSummary } from "../model/catalogSelectors";

export type EventProgramCardProps = {
  isSelected?: boolean;
  onSelect?: ((program: EventProgram) => void) | undefined;
  summary: ProgramSummary;
};

/** Summarizes an event program and optionally selects it as the working context. */
export function EventProgramCard({ isSelected = false, onSelect, summary }: EventProgramCardProps) {
  const { activityCount, enrolledCount, program, unit } = summary;
  const unitColorKey = getUnitColorKey(unit.code);
  const dateRange = formatProgramDateRange(program);

  return (
    <Surface as="article" padding="normal" selected={isSelected}>
      <Stack gap={4}>
        <HStack gap={3} wrap="wrap">
          <Badge bg={`unit.bg.${unitColorKey}`} color={`unit.fg.${unitColorKey}`} rounded="full">
            {getProgramBadgeLabel(program, unit)}
          </Badge>
          {program.isDefault ? (
            <Badge rounded="full" variant="subtle">
              Programa predeterminado
            </Badge>
          ) : null}
        </HStack>
        <Box>
          <Text color="text.default" fontFamily="heading" fontSize="2xl" fontWeight="700">
            {program.name}
          </Text>
          <Text color="text.muted" fontSize="sm" mt={2}>
            {dateRange ?? "Agenda permanente"}
          </Text>
        </Box>
        <HStack gap={5} wrap="wrap">
          <Box>
            <Text color="text.muted" fontSize="xs" fontWeight="800" textTransform="uppercase">
              Actividades
            </Text>
            <Text color="text.default" fontSize="xl" fontWeight="800">
              {activityCount}
            </Text>
          </Box>
          <Box>
            <Text color="text.muted" fontSize="xs" fontWeight="800" textTransform="uppercase">
              Inscritos
            </Text>
            <Text color="text.default" fontSize="xl" fontWeight="800">
              {enrolledCount}
            </Text>
          </Box>
        </HStack>
        {onSelect ? (
          <Button
            aria-label={`Usar ${program.name} en panel`}
            aria-pressed={isSelected}
            colorPalette="terracotta"
            onClick={() => onSelect(program)}
            rounded="full"
            size="sm"
            variant={isSelected ? "solid" : "outline"}
          >
            {isSelected ? "Contexto activo" : "Usar en panel"}
          </Button>
        ) : null}
      </Stack>
    </Surface>
  );
}
