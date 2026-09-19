import { Badge, Box, HStack, Stack, Text } from "@chakra-ui/react";

import type { LargeEvent, SmallEvent } from "@/types/domain";
import { formatEventDate } from "@utils/eventFilters";

type EventCardProps = {
  event: SmallEvent;
  parentEvent?: LargeEvent | undefined;
};

const eventTypeLabel: Record<SmallEvent["type"], string> = {
  conference: "Conferencia",
  seminar: "Seminario",
  talk: "Charla",
  workshop: "Taller",
};

export function EventCard({ event, parentEvent }: EventCardProps) {
  return (
    <Box
      bg="surface.raised"
      borderColor="border.subtle"
      borderWidth="1px"
      overflow="hidden"
      rounded="3xl"
      transition="transform 160ms ease, box-shadow 160ms ease"
      _hover={{ boxShadow: "0 28px 80px rgba(65, 31, 20, 0.14)", transform: "translateY(-3px)" }}
    >
      <Box background="linear-gradient(135deg, #5d0912 0%, #a81520 52%, #f2b15c 100%)" h="10px" />
      <Stack gap={5} p={{ base: 5, md: 6 }}>
        <HStack gap={3} wrap="wrap">
          <Badge colorPalette="red" rounded="full" variant="subtle">
            {eventTypeLabel[event.type]}
          </Badge>
          {parentEvent ? (
            <Badge colorPalette="orange" rounded="full" variant="surface">
              {parentEvent.customLabel}
            </Badge>
          ) : null}
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
            {formatEventDate(event.date)} · {event.time} · {event.speaker}
          </Text>
        </Box>
        <HStack align="start" gap={5} wrap="wrap">
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
      </Stack>
    </Box>
  );
}
