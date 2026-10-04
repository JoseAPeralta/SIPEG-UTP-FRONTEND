import { Badge, Box, Button, HStack, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";

import { Surface } from "@/components/publicUi";
import { getActivityTypeColorKey, getUnitColorKey } from "@theme/index";
import { formatActivityDate } from "@/utils/dateFormatting";

import { activityTypeLabels } from "../model/catalogLabels";
import type { PublicActivityRow } from "../model/publicCatalogSelectors";

const DESCRIPTION_PREVIEW_LENGTH = 128;

export type PublicActivityCardProps = {
  /** Fila de la agenda publica: la actividad y su unidad ya resueltas. */
  row: PublicActivityRow;
};

/**
 * Presenta una actividad de la agenda publica.
 *
 * No acepta banderas de presentacion a proposito: el listado publico del API no
 * expone equipamiento ni inscritos, asi que no hay nada que ocultar. Esa
 * diferencia con la tarjeta administrativa es estructural, no de configuracion.
 */
export function PublicActivityCard({ row }: PublicActivityCardProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const { activity, programBadgeLabel, unitCode } = row;
  const typeColorKey = getActivityTypeColorKey(activity.type);
  const unitColorKey = getUnitColorKey(unitCode);
  const description = activity.description?.trim() ?? "";
  const hasDescription = description.length > 0;
  const hasLongDescription = description.length > DESCRIPTION_PREVIEW_LENGTH;
  const visibleDescription =
    hasLongDescription && !isDescriptionExpanded
      ? `${description.slice(0, DESCRIPTION_PREVIEW_LENGTH).trim()}...`
      : description;

  return (
    <Surface
      as="article"
      display="flex"
      flexDirection="column"
      h="full"
      interactive
      overflow="hidden"
    >
      <Box background="linear-gradient(135deg, #6E2411 0%, #9C3A1E 52%, #E59A72 100%)" h="10px" />
      <Stack flex="1" gap={5} p={{ base: 5, md: 6 }}>
        <HStack gap={3} wrap="wrap">
          <Badge bg={`unit.bg.${unitColorKey}`} color={`unit.fg.${unitColorKey}`} rounded="full">
            {programBadgeLabel}
          </Badge>
          <Badge bg={`type.bg.${typeColorKey}`} color={`type.fg.${typeColorKey}`} rounded="full">
            {activityTypeLabels[activity.type]}
          </Badge>
        </HStack>
        <Box>
          <Text
            color="text.default"
            fontFamily="heading"
            fontSize="2xl"
            fontWeight="700"
            lineHeight="1.08"
          >
            {activity.name}
          </Text>
          <Text color="text.muted" fontSize="sm" mt={2}>
            {formatActivityDate(activity.date)} · {activity.startTime} - {activity.endTime}
            {activity.classroom ? ` · ${activity.classroom.name}` : ""}
          </Text>
        </Box>
        {hasDescription ? (
          <Box>
            <Text color="text.muted" fontSize="sm" lineHeight="1.65">
              {visibleDescription}
            </Text>
            {hasLongDescription ? (
              <Button
                colorPalette="terracotta"
                mt={2}
                onClick={() => setIsDescriptionExpanded((currentValue) => !currentValue)}
                px={0}
                size="xs"
                variant="plain"
              >
                {isDescriptionExpanded ? "Leer menos" : "Leer mas"}
              </Button>
            ) : null}
          </Box>
        ) : null}
        {activity.speakers.length > 0 ? (
          <Stack gap={2}>
            <Text
              color="text.muted"
              fontSize="xs"
              fontWeight="800"
              letterSpacing="0.08em"
              textTransform="uppercase"
            >
              {activity.speakers.length === 1 ? "Expositor" : "Expositores"}
            </Text>
            <Stack gap={1}>
              {activity.speakers.map((speaker) => (
                <Text color="text.default" fontSize="sm" fontWeight="700" key={speaker.id}>
                  {speaker.firstName} {speaker.lastName}
                </Text>
              ))}
            </Stack>
          </Stack>
        ) : null}
      </Stack>
    </Surface>
  );
}
