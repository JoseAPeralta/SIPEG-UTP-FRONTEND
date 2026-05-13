import { Badge, Box, SimpleGrid, Stack, Text } from "@chakra-ui/react";

import { EventCard } from "@components/EventCard";
import { ModuleShell } from "@components/ModuleShell";
import { classrooms, faculties, largeEvents, smallEvents } from "@/data/sipeg";
import { useFacultyPreferenceStore } from "@store/facultyPreference";
import { formatDateRange, getEventsForFaculty } from "@utils/eventFilters";

export function EventsPage() {
  const selectedFacultyId = useFacultyPreferenceStore((state) => state.selectedFacultyId);
  const visibleEvents = getEventsForFaculty(smallEvents, selectedFacultyId);

  return (
    <ModuleShell
      description="Listado preparado para separar eventos grandes, eventos pequenos, permisos heredados y filtros por facultad antes de conectar el cliente API."
      eyebrow="Agenda institucional"
      title="Eventos academicos"
    >
      <Stack gap={7}>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={5}>
          {largeEvents.map((event) => (
            <Box
              bg="surface.raised"
              borderColor="border.subtle"
              borderWidth="1px"
              key={event.id}
              p={6}
              rounded="3xl"
            >
              <Badge colorPalette="orange" rounded="full" variant="subtle">
                {event.customLabel}
              </Badge>
              <Text
                color="text.default"
                fontFamily="heading"
                fontSize="3xl"
                fontWeight="700"
                lineHeight="1.05"
                mt={4}
              >
                {event.name}
              </Text>
              <Text color="text.muted" mt={3}>
                {formatDateRange(event.startDate, event.endDate)} ·{" "}
                {faculties.find((faculty) => faculty.id === event.facultyId)?.shortName}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={5}>
          {visibleEvents.map((event) => (
            <EventCard
              classroom={classrooms.find((classroom) => classroom.id === event.classroomId)}
              event={event}
              faculty={faculties.find((faculty) => faculty.id === event.facultyId)}
              key={event.id}
              parentEvent={largeEvents.find((largeEvent) => largeEvent.id === event.parentEventId)}
            />
          ))}
        </SimpleGrid>
      </Stack>
    </ModuleShell>
  );
}

export default EventsPage;
