import { startTransition, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Field,
  Flex,
  HStack,
  Input,
  NativeSelect,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";

import { EventCard } from "@components/EventCard";
import { ModuleShell } from "@components/ModuleShell";
import { PaginationControls } from "@components/PaginationControls";
import { classrooms, faculties, largeEvents, smallEvents } from "@/data/sipeg";
import { useSelectedEventStore } from "@/store/selectedEvent";
import type { EventType, FacultyId, LargeEvent, SmallEvent } from "@/types/domain";
import { formatDateRange } from "@utils/eventFilters";

type FacultyFilter = "all" | FacultyId;
type EventTypeFilter = "all" | EventType;
type ParentEventFilter = string;
type SortDirection = "asc" | "desc";

const EVENTS_PER_PAGE = 9;

const eventTypeLabels: Record<EventType, string> = {
  conference: "Conferencia",
  seminar: "Seminario",
  talk: "Charla",
  workshop: "Taller",
};

function getEventTimestamp(event: SmallEvent) {
  return new Date(`${event.date}T${event.startTime}:00`).getTime();
}

function getParentEvent(event: SmallEvent) {
  return largeEvents.find((largeEvent) => largeEvent.id === event.parentEventId);
}

function getFaculty(event: SmallEvent | LargeEvent) {
  return faculties.find((faculty) => faculty.id === event.facultyId);
}

function getClassroom(event: SmallEvent) {
  return classrooms.find((classroom) => classroom.id === event.classroomId);
}

function getChildEvents(eventId: LargeEvent["id"]) {
  return smallEvents.filter((event) => event.parentEventId === eventId);
}

function getSearchText(event: SmallEvent) {
  const classroom = getClassroom(event);
  const faculty = getFaculty(event);
  const parentEvent = getParentEvent(event);

  return [
    event.name,
    event.description,
    event.type,
    classroom?.name,
    faculty?.name,
    faculty?.shortName,
    parentEvent?.name,
    ...event.speakers.flatMap((speaker) => [speaker.name, speaker.organization]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getFilteredEvents({
  eventTypeFilter,
  facultyFilter,
  parentEventFilter,
  searchTerm,
  sortDirection,
}: {
  eventTypeFilter: EventTypeFilter;
  facultyFilter: FacultyFilter;
  parentEventFilter: ParentEventFilter;
  searchTerm: string;
  sortDirection: SortDirection;
}) {
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  return [...smallEvents]
    .filter((event) => facultyFilter === "all" || event.facultyId === facultyFilter)
    .filter((event) => eventTypeFilter === "all" || event.type === eventTypeFilter)
    .filter((event) => {
      if (parentEventFilter === "all") {
        return true;
      }

      if (parentEventFilter === "standalone") {
        return !event.parentEventId;
      }

      return event.parentEventId === parentEventFilter;
    })
    .filter((event) => !normalizedSearchTerm || getSearchText(event).includes(normalizedSearchTerm))
    .sort((firstEvent, secondEvent) => {
      const dateDifference = getEventTimestamp(firstEvent) - getEventTimestamp(secondEvent);

      return sortDirection === "asc" ? dateDifference : -dateDifference;
    });
}

function getSelectedEventName(selectedEventId: string | null) {
  if (!selectedEventId) {
    return null;
  }

  return (
    largeEvents.find((event) => event.id === selectedEventId)?.name ??
    smallEvents.find((event) => event.id === selectedEventId)?.name ??
    null
  );
}

function SummaryTile({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <Box
      bg="surface.raised"
      borderColor="border.subtle"
      borderWidth="1px"
      p={{ base: 5, md: 6 }}
      rounded="3xl"
      shadow="0 20px 70px rgba(65, 31, 20, 0.08)"
    >
      <Text color="accent.solid" fontFamily="heading" fontSize="4xl" fontWeight="700">
        {value} {label}
      </Text>
      <Text color="text.muted" fontSize="sm" mt={2}>
        {detail}
      </Text>
    </Box>
  );
}

export function EventsPage() {
  const selectedEventId = useSelectedEventStore((state) => state.selectedEventId);
  const setSelectedEventId = useSelectedEventStore((state) => state.setSelectedEventId);
  const [searchTerm, setSearchTerm] = useState("");
  const [facultyFilter, setFacultyFilter] = useState<FacultyFilter>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<EventTypeFilter>("all");
  const [parentEventFilter, setParentEventFilter] = useState<ParentEventFilter>("all");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const totalRegisteredAttendees = smallEvents.reduce(
    (total, event) => total + event.registeredAttendees,
    0,
  );
  const coveredFacultyCount = new Set(
    smallEvents.flatMap((event) => (event.facultyId ? [event.facultyId] : [])),
  ).size;
  const selectedEventName = getSelectedEventName(selectedEventId);
  const filteredEvents = getFilteredEvents({
    eventTypeFilter,
    facultyFilter,
    parentEventFilter,
    searchTerm,
    sortDirection,
  });
  const pageCount = Math.max(1, Math.ceil(filteredEvents.length / EVENTS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const firstVisibleEventIndex = (currentPage - 1) * EVENTS_PER_PAGE;
  const visibleEvents = filteredEvents.slice(
    firstVisibleEventIndex,
    firstVisibleEventIndex + EVENTS_PER_PAGE,
  );

  const resetPage = () => setPage(1);

  const clearFilters = () => {
    startTransition(() => {
      setSearchTerm("");
      setFacultyFilter("all");
      setEventTypeFilter("all");
      setParentEventFilter("all");
      setSortDirection("asc");
      resetPage();
    });
  };

  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
  };

  return (
    <ModuleShell
      description="Organiza series, filtra eventos pequenos y define el evento de trabajo usado por asistencia, certificados y reportes."
      eyebrow="Agenda institucional"
      title="Eventos academicos"
    >
      <Stack gap={{ base: 6, md: 8 }}>
        <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} gap={5}>
          <SummaryTile
            detail="Series que agrupan permisos y agenda hija."
            label="eventos grandes"
            value={String(largeEvents.length)}
          />
          <SummaryTile
            detail="Sesiones administrables con aula, horario y expositores."
            label="eventos pequenos"
            value={String(smallEvents.length)}
          />
          <SummaryTile
            detail="inscripciones acumuladas"
            label="personas registradas"
            value={String(totalRegisteredAttendees)}
          />
          <SummaryTile
            detail="facultades cubiertas"
            label="alcance academico"
            value={String(coveredFacultyCount)}
          />
        </SimpleGrid>

        <Box
          bg="linear-gradient(135deg, rgba(110, 36, 17, 0.95), rgba(156, 58, 30, 0.9) 58%, rgba(229, 154, 114, 0.82))"
          color="white"
          overflow="hidden"
          p={{ base: 5, md: 7 }}
          position="relative"
          rounded="3xl"
          role="status"
        >
          <Box
            bg="rgba(255, 255, 255, 0.18)"
            h="160px"
            position="absolute"
            right="-48px"
            rounded="full"
            top="-64px"
            w="160px"
          />
          <Stack gap={2} maxW="3xl" position="relative">
            <Text fontSize="sm" fontWeight="900" letterSpacing="0.14em" textTransform="uppercase">
              Evento de trabajo
            </Text>
            <Text fontFamily="heading" fontSize={{ base: "3xl", md: "4xl" }} fontWeight="700">
              {selectedEventName ?? "Selecciona una serie o evento para operar el panel"}
            </Text>
            <Text color="whiteAlpha.800" lineHeight="1.7">
              La seleccion activa conecta esta agenda con asistencia, certificados y reportes sin
              salir del flujo administrativo.
            </Text>
          </Stack>
        </Box>

        <Box as="section" aria-labelledby="series-title">
          <Stack gap={4}>
            <Flex align={{ base: "start", md: "end" }} gap={4} justify="space-between" wrap="wrap">
              <Box>
                <Text
                  color="text.muted"
                  fontSize="sm"
                  fontWeight="800"
                  letterSpacing="0.1em"
                  textTransform="uppercase"
                >
                  Series institucionales
                </Text>
                <Text
                  color="text.default"
                  fontFamily="heading"
                  fontSize={{ base: "3xl", md: "4xl" }}
                  fontWeight="700"
                  id="series-title"
                >
                  Eventos grandes
                </Text>
              </Box>
              <Badge colorPalette="terracotta" px={4} py={2} rounded="full" variant="subtle">
                {largeEvents.length} series activas
              </Badge>
            </Flex>

            <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={5}>
              {largeEvents.map((event) => {
                const childEvents = getChildEvents(event.id);
                const registeredAttendees = childEvents.reduce(
                  (total, childEvent) => total + childEvent.registeredAttendees,
                  0,
                );
                const faculty = getFaculty(event);
                const isSelected = selectedEventId === event.id;

                return (
                  <Box
                    bg="surface.raised"
                    borderColor={isSelected ? "accent.solid" : "border.subtle"}
                    borderWidth="1px"
                    key={event.id}
                    overflow="hidden"
                    rounded="3xl"
                    shadow={isSelected ? "0 24px 80px rgba(156, 58, 30, 0.18)" : undefined}
                  >
                    <Box
                      background="linear-gradient(135deg, #6E2411 0%, #9C3A1E 58%, #E59A72 100%)"
                      h="8px"
                    />
                    <Stack gap={5} p={6}>
                      <HStack gap={3} wrap="wrap">
                        <Badge colorPalette="terracotta" rounded="full" variant="subtle">
                          {event.customLabel}
                        </Badge>
                        {faculty ? (
                          <Badge colorPalette="gray" rounded="full" variant="surface">
                            {faculty.shortName}
                          </Badge>
                        ) : null}
                        {isSelected ? (
                          <Badge colorPalette="success" rounded="full" variant="subtle">
                            Activo
                          </Badge>
                        ) : null}
                      </HStack>
                      <Box>
                        <Text
                          color="text.default"
                          fontFamily="heading"
                          fontSize="3xl"
                          fontWeight="700"
                          lineHeight="1.05"
                        >
                          {event.name}
                        </Text>
                        <Text color="text.muted" mt={3}>
                          {formatDateRange(event.startDate, event.endDate)}
                        </Text>
                      </Box>
                      <SimpleGrid columns={2} gap={3}>
                        <Box>
                          <Text
                            color="accent.solid"
                            fontFamily="heading"
                            fontSize="2xl"
                            fontWeight="700"
                          >
                            {childEvents.length}
                          </Text>
                          <Text color="text.muted" fontSize="sm" fontWeight="700">
                            eventos hijos
                          </Text>
                        </Box>
                        <Box>
                          <Text
                            color="accent.solid"
                            fontFamily="heading"
                            fontSize="2xl"
                            fontWeight="700"
                          >
                            {registeredAttendees}
                          </Text>
                          <Text color="text.muted" fontSize="sm" fontWeight="700">
                            inscritos
                          </Text>
                        </Box>
                      </SimpleGrid>
                      <Button
                        aria-label={`Usar ${event.name} en panel`}
                        colorPalette="terracotta"
                        onClick={() => handleSelectEvent(event.id)}
                        rounded="full"
                        variant={isSelected ? "solid" : "outline"}
                      >
                        {isSelected ? "Evento activo" : "Usar en panel"}
                      </Button>
                    </Stack>
                  </Box>
                );
              })}
            </SimpleGrid>
          </Stack>
        </Box>

        <Box
          bg="surface.raised"
          borderColor="border.subtle"
          borderWidth="1px"
          p={{ base: 5, md: 6 }}
          rounded="3xl"
        >
          <Stack gap={5}>
            <Flex
              align={{ base: "start", md: "center" }}
              gap={4}
              justify="space-between"
              wrap="wrap"
            >
              <Box>
                <Text
                  color="text.muted"
                  fontSize="sm"
                  fontWeight="800"
                  letterSpacing="0.1em"
                  textTransform="uppercase"
                >
                  Busqueda operativa
                </Text>
                <Text color="text.default" fontFamily="heading" fontSize="3xl" fontWeight="700">
                  Filtra el catalogo
                </Text>
              </Box>
              <Button
                colorPalette="terracotta"
                onClick={clearFilters}
                rounded="full"
                variant="outline"
              >
                Limpiar filtros
              </Button>
            </Flex>
            <SimpleGrid columns={{ base: 1, md: 2, xl: 5 }} gap={4}>
              <Field.Root>
                <Field.Label htmlFor="event-search">Buscar eventos</Field.Label>
                <Input
                  id="event-search"
                  onChange={(event) => {
                    startTransition(() => {
                      setSearchTerm(event.target.value);
                      resetPage();
                    });
                  }}
                  placeholder="Nombre, expositor, aula..."
                  value={searchTerm}
                />
              </Field.Root>
              <Field.Root>
                <Field.Label htmlFor="event-faculty-filter">Facultad</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    id="event-faculty-filter"
                    onChange={(event) => {
                      startTransition(() => {
                        setFacultyFilter(event.target.value as FacultyFilter);
                        resetPage();
                      });
                    }}
                    value={facultyFilter}
                  >
                    <option value="all">Todas</option>
                    {faculties.map((faculty) => (
                      <option key={faculty.id} value={faculty.id}>
                        {faculty.shortName}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>
              <Field.Root>
                <Field.Label htmlFor="event-type-filter">Tipo</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    id="event-type-filter"
                    onChange={(event) => {
                      startTransition(() => {
                        setEventTypeFilter(event.target.value as EventTypeFilter);
                        resetPage();
                      });
                    }}
                    value={eventTypeFilter}
                  >
                    <option value="all">Todos</option>
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
                <Field.Label htmlFor="event-parent-filter">Serie</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    id="event-parent-filter"
                    onChange={(event) => {
                      startTransition(() => {
                        setParentEventFilter(event.target.value);
                        resetPage();
                      });
                    }}
                    value={parentEventFilter}
                  >
                    <option value="all">Todas</option>
                    <option value="standalone">Sin serie</option>
                    {largeEvents.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.customLabel}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>
              <Field.Root>
                <Field.Label htmlFor="event-sort-direction">Orden</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    id="event-sort-direction"
                    onChange={(event) => {
                      startTransition(() => {
                        setSortDirection(event.target.value as SortDirection);
                        resetPage();
                      });
                    }}
                    value={sortDirection}
                  >
                    <option value="asc">Mas antiguos</option>
                    <option value="desc">Mas recientes</option>
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>
            </SimpleGrid>
          </Stack>
        </Box>

        <Box as="section" aria-label="Catalogo de eventos pequenos" role="region">
          <Stack gap={5}>
            <Flex align={{ base: "start", md: "end" }} gap={4} justify="space-between" wrap="wrap">
              <Box>
                <Text
                  color="text.muted"
                  fontSize="sm"
                  fontWeight="800"
                  letterSpacing="0.1em"
                  textTransform="uppercase"
                >
                  Resultados filtrados
                </Text>
                <Text color="text.default" fontFamily="heading" fontSize="3xl" fontWeight="700">
                  Eventos pequenos
                </Text>
              </Box>
              <Text color="text.muted" fontWeight="700">
                Pagina {currentPage} de {pageCount} · {filteredEvents.length} resultados
              </Text>
            </Flex>

            {visibleEvents.length > 0 ? (
              <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={5}>
                {visibleEvents.map((event) => {
                  const isSelected = selectedEventId === event.id;

                  return (
                    <Stack
                      bg={isSelected ? "rgba(156, 58, 30, 0.05)" : "transparent"}
                      borderColor={isSelected ? "accent.solid" : "transparent"}
                      borderWidth="1px"
                      gap={3}
                      key={event.id}
                      p={isSelected ? 2 : 0}
                      rounded="3xl"
                    >
                      <EventCard
                        classroom={getClassroom(event)}
                        event={event}
                        faculty={getFaculty(event)}
                        parentEvent={getParentEvent(event)}
                      />
                      <Button
                        aria-label={`Usar ${event.name} en panel`}
                        colorPalette="terracotta"
                        onClick={() => handleSelectEvent(event.id)}
                        rounded="full"
                        variant={isSelected ? "solid" : "outline"}
                      >
                        {isSelected ? "Evento activo" : "Usar en panel"}
                      </Button>
                    </Stack>
                  );
                })}
              </SimpleGrid>
            ) : (
              <Box
                bg="surface.raised"
                borderColor="border.subtle"
                borderWidth="1px"
                p={{ base: 6, md: 8 }}
                rounded="3xl"
              >
                <Text color="text.default" fontFamily="heading" fontSize="2xl" fontWeight="700">
                  No hay eventos con esos filtros
                </Text>
                <Text color="text.muted" mt={2}>
                  Limpia la busqueda o cambia la facultad, tipo, serie u orden para ampliar el
                  catalogo.
                </Text>
              </Box>
            )}

            <PaginationControls
              currentPage={currentPage}
              itemLabel="eventos"
              onPageChange={setPage}
              pageCount={pageCount}
              totalItems={filteredEvents.length}
              visibleItems={visibleEvents.length}
            />
          </Stack>
        </Box>
      </Stack>
    </ModuleShell>
  );
}

export default EventsPage;
