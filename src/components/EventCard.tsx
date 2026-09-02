import { useState } from "react";
import { Badge, Box, Button, HStack, Stack, Text } from "@chakra-ui/react";

import type { Classroom, Faculty, LargeEvent, SmallEvent } from "@/types/domain";
import { formatEventDate } from "@utils/eventFilters";

type EventCardProps = {
  classroom?: Classroom | undefined;
  event: SmallEvent;
  faculty?: Faculty | undefined;
  parentEvent?: LargeEvent | undefined;
  showDashboardDetails?: boolean;
};

const DESCRIPTION_PREVIEW_LENGTH = 128;

const eventTypeLabel: Record<SmallEvent["type"], string> = {
  conference: "Conferencia",
  seminar: "Seminario",
  talk: "Charla",
  workshop: "Taller",
};

export function EventCard({
  classroom,
  event,
  faculty,
  parentEvent,
  showDashboardDetails = false,
}: EventCardProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const description = event.description?.trim() ?? "";
  const hasDescription = description.length > 0;
  const hasLongDescription = description.length > DESCRIPTION_PREVIEW_LENGTH;
  const visibleDescription =
    hasLongDescription && !isDescriptionExpanded
      ? `${description.slice(0, DESCRIPTION_PREVIEW_LENGTH).trim()}...`
      : description;

  return (
    <Box
      as="article"
      bg="surface.raised"
      borderColor="border.subtle"
      borderWidth="1px"
      display="flex"
      flexDirection="column"
      h="full"
      overflow="hidden"
      rounded="3xl"
      transition="transform 160ms ease, box-shadow 160ms ease"
      _hover={{ boxShadow: "0 28px 80px rgba(65, 31, 20, 0.14)", transform: "translateY(-3px)" }}
    >
      <Box background="linear-gradient(135deg, #6E2411 0%, #9C3A1E 52%, #E59A72 100%)" h="10px" />
      <Stack flex="1" gap={5} p={{ base: 5, md: 6 }}>
        <HStack gap={3} wrap="wrap">
          {parentEvent ? (
            <Badge colorPalette="terracotta" rounded="full" variant="surface">
              {parentEvent.customLabel}
            </Badge>
          ) : null}
          {faculty ? (
            <Badge colorPalette="gray" rounded="full" variant="surface">
              {faculty.shortName}
            </Badge>
          ) : null}
          <Badge colorPalette="terracotta" rounded="full" variant="subtle">
            {eventTypeLabel[event.type]}
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
            {event.name}
          </Text>
          <Text color="text.muted" fontSize="sm" mt={2}>
            {formatEventDate(event.date)} · {event.startTime} - {event.endTime}
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
        {event.speakers.length > 0 ? (
          <Stack gap={2}>
            <Text
              color="text.muted"
              fontSize="xs"
              fontWeight="800"
              letterSpacing="0.08em"
              textTransform="uppercase"
            >
              {event.speakers.length === 1 ? "Expositor" : "Expositores"}
            </Text>
            <Stack gap={1}>
              {event.speakers.map((speaker) => (
                <Text
                  color="text.default"
                  fontSize="sm"
                  fontWeight="700"
                  key={`${speaker.name}-${speaker.organization}`}
                >
                  {speaker.name} · {speaker.organization}
                </Text>
              ))}
            </Stack>
          </Stack>
        ) : null}
        {showDashboardDetails ? (
          <HStack align="start" gap={5} mt="auto" wrap="wrap">
            <Box>
              <Text
                color="text.muted"
                fontSize="xs"
                fontWeight="800"
                letterSpacing="0.08em"
                textTransform="uppercase"
              >
                Asistentes
              </Text>
              <Text color="text.default" fontSize="xl" fontWeight="800">
                {event.registeredAttendees}
              </Text>
            </Box>
            <Box>
              <Text
                color="text.muted"
                fontSize="xs"
                fontWeight="800"
                letterSpacing="0.08em"
                textTransform="uppercase"
              >
                Equipo
              </Text>
              <Text color="text.default" fontSize="sm">
                {event.equipment.join(", ")}
              </Text>
            </Box>
          </HStack>
        ) : null}
      </Stack>
    </Box>
  );
}
