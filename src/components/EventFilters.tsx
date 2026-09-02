import { Badge, Box, Field, Flex, NativeSelect, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { faculties } from "@/data/sipeg";
import type { EventType, FacultyId } from "@/types/domain";

export type FacultyFilter = "all" | FacultyId;
export type EventTypeFilter = "all" | EventType;
export type SortDirection = "asc" | "desc";

const eventTypeLabels: Record<EventType, string> = {
  conference: "Conferencia",
  seminar: "Seminario",
  talk: "Charla",
  workshop: "Taller",
};

type EventFiltersProps = {
  currentPage: number;
  eventTypeFilter: EventTypeFilter;
  facultyFilter: FacultyFilter;
  filteredCount: number;
  onEventTypeChange: (filter: EventTypeFilter) => void;
  onFacultyChange: (filter: FacultyFilter) => void;
  onSortDirectionChange: (direction: SortDirection) => void;
  sortDirection: SortDirection;
};

export function EventFilters({
  eventTypeFilter,
  facultyFilter,
  filteredCount,
  onEventTypeChange,
  onFacultyChange,
  onSortDirectionChange,
  sortDirection,
}: EventFiltersProps) {
  return (
    <Box
      aria-label="Filtros de eventos"
      bg="surface.raised"
      borderColor="border.subtle"
      borderWidth="1px"
      p={{ base: 5, md: 6 }}
      rounded="xl"
    >
      <Stack gap={5}>
        <Flex align={{ base: "start", md: "center" }} gap={4} justify="space-between" wrap="wrap">
          <Box>
            <Text
              color="text.muted"
              fontSize="sm"
              fontWeight="800"
              letterSpacing="0.1em"
              textTransform="uppercase"
            >
              Explorar agenda
            </Text>
            <Text color="text.default" fontFamily="heading" fontSize="3xl" fontWeight="700">
              Filtra eventos disponibles
            </Text>
          </Box>
          <Badge colorPalette="terracotta" px={4} py={2} rounded="full" variant="subtle">
            {filteredCount} resultados
          </Badge>
        </Flex>
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
          <Field.Root>
            <Field.Label htmlFor="faculty-filter">Facultad</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                id="faculty-filter"
                onChange={(e) => onFacultyChange(e.target.value as FacultyFilter)}
                value={facultyFilter}
              >
                <option value="all">Todas las facultades</option>
                {faculties.map((faculty) => (
                  <option key={faculty.id} value={faculty.id}>
                    {faculty.shortName} - {faculty.name}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>
          <Field.Root>
            <Field.Label htmlFor="event-type-filter">Tipo de evento</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                id="event-type-filter"
                onChange={(e) => onEventTypeChange(e.target.value as EventTypeFilter)}
                value={eventTypeFilter}
              >
                <option value="all">Todos los tipos</option>
                {Object.entries(eventTypeLabels).map(([eventType, label]) => (
                  <option key={eventType} value={eventType}>
                    {label}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>
          <Field.Root>
            <Field.Label htmlFor="event-sort">Orden</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                id="event-sort"
                onChange={(e) => onSortDirectionChange(e.target.value as SortDirection)}
                value={sortDirection}
              >
                <option value="asc">Ascendente</option>
                <option value="desc">Descendente</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>
        </SimpleGrid>
      </Stack>
    </Box>
  );
}
