import { Badge, Box, Button, HStack, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";

import { Surface } from "@/components";
import { getActivityTypeColorKey, getUnitColorKey } from "@theme/index";
import type { Activity, Classroom, EventProgram, OrganizationalUnit } from "@/types/domain";
import { formatActivityDate } from "@/utils/dateFormatting";

import { activityTypeLabels, getProgramBadgeLabel } from "../model/catalogSelectors";

const DESCRIPTION_PREVIEW_LENGTH = 128;

export type ActivityCardProps = {
  activity: Activity;
  classroom: Classroom | null;
  isSelected?: boolean;
  onSelect?: ((activity: Activity) => void) | undefined;
  program: EventProgram;
  showEnrolledCount?: boolean;
  showEquipment?: boolean;
  unit: OrganizationalUnit;
};

/** Presents an activity in public, metrics or selectable working-context modes. */
export function ActivityCard({
  activity,
  classroom,
  isSelected = false,
  onSelect,
  program,
  showEnrolledCount = false,
  showEquipment = true,
  unit,
}: ActivityCardProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const unitColorKey = getUnitColorKey(unit);
  const typeColorKey = getActivityTypeColorKey(activity.type);
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
      selected={isSelected}
    >
      <Box background="linear-gradient(135deg, #6E2411 0%, #9C3A1E 52%, #E59A72 100%)" h="10px" />
      <Stack flex="1" gap={5} p={{ base: 5, md: 6 }}>
        <HStack gap={3} wrap="wrap">
          <Badge bg={`unit.bg.${unitColorKey}`} color={`unit.fg.${unitColorKey}`} rounded="full">
            {getProgramBadgeLabel(program, unit)}
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
            {classroom ? ` · ${classroom.name}` : ""}
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
        <HStack align="start" gap={5} mt="auto" wrap="wrap">
          {showEnrolledCount ? (
            <Box>
              <Text
                color="text.muted"
                fontSize="xs"
                fontWeight="800"
                letterSpacing="0.08em"
                textTransform="uppercase"
              >
                Inscritos
              </Text>
              <Text color="text.default" fontSize="xl" fontWeight="800">
                {activity.enrolledCount}
              </Text>
            </Box>
          ) : null}
          {showEquipment && activity.equipment.length > 0 ? (
            <Box>
              <Text
                color="text.muted"
                fontSize="xs"
                fontWeight="800"
                letterSpacing="0.08em"
                textTransform="uppercase"
              >
                Equipamiento
              </Text>
              <Text color="text.default" fontSize="sm">
                {activity.equipment.join(", ")}
              </Text>
            </Box>
          ) : null}
        </HStack>
        {onSelect ? (
          <Button
            aria-label={`Usar ${activity.name} en panel`}
            aria-pressed={isSelected}
            colorPalette="terracotta"
            onClick={() => onSelect(activity)}
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
