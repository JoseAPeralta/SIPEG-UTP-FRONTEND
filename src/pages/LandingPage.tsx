import { startTransition, useState } from "react";
import {
  Badge,
  Box,
  Flex,
  Heading,
  HStack,
  Image,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";

import { EventCard } from "@components/EventCard";
import {
  EventFilters,
  type EventTypeFilter,
  type FacultyFilter,
  type SortDirection,
} from "@components/EventFilters";
import { PaginationControls } from "@components/PaginationControls";
import { classrooms, faculties, largeEvents, smallEvents } from "@/data/sipeg";
import type { SmallEvent } from "@/types/domain";

const EVENTS_PER_PAGE = 10;

const heroImageSource = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 720" role="img" aria-label="Agenda academica SIPEG">
  <defs>
    <linearGradient id="sky" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#5d0912"/>
      <stop offset="0.52" stop-color="#a81520"/>
      <stop offset="1" stop-color="#f2b15c"/>
    </linearGradient>
    <radialGradient id="glow" cx="68%" cy="22%" r="58%">
      <stop offset="0" stop-color="#fff7ef" stop-opacity="0.82"/>
      <stop offset="1" stop-color="#fff7ef" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="960" height="720" rx="52" fill="url(#sky)"/>
  <rect width="960" height="720" rx="52" fill="url(#glow)"/>
  <g fill="none" stroke="#fff7ef" stroke-opacity="0.42" stroke-width="2">
    <path d="M112 126h736M112 252h736M112 378h736M112 504h736M236 82v568M420 82v568M604 82v568M788 82v568"/>
  </g>
  <g transform="translate(118 116)">
    <rect width="720" height="454" rx="40" fill="#fff7ef" fill-opacity="0.92"/>
    <rect x="44" y="54" width="632" height="58" rx="20" fill="#5d0912" fill-opacity="0.12"/>
    <rect x="44" y="148" width="270" height="208" rx="28" fill="#a81520"/>
    <rect x="350" y="148" width="326" height="92" rx="26" fill="#efe3d2"/>
    <rect x="350" y="264" width="326" height="92" rx="26" fill="#efe3d2"/>
    <circle cx="116" cy="252" r="42" fill="#f2b15c"/>
    <path d="M178 226h86M178 254h62M178 282h96" stroke="#fff7ef" stroke-linecap="round" stroke-width="18"/>
    <path d="M394 180h132M394 216h216M394 296h132M394 332h192" stroke="#5d0912" stroke-linecap="round" stroke-opacity="0.72" stroke-width="16"/>
    <text x="58" y="94" fill="#5d0912" font-family="Georgia, serif" font-size="42" font-weight="700">SIPEG</text>
    <text x="518" y="94" fill="#a81520" font-family="Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="4">EVENTOS UTP</text>
  </g>
</svg>`)} `;

function getEventTimestamp(event: SmallEvent) {
  return new Date(`${event.date}T${event.startTime}:00`).getTime();
}

function getFilteredEvents(
  facultyFilter: FacultyFilter,
  eventTypeFilter: EventTypeFilter,
  sortDirection: SortDirection,
) {
  return [...smallEvents]
    .filter((event) => facultyFilter === "all" || event.facultyId === facultyFilter)
    .filter((event) => eventTypeFilter === "all" || event.type === eventTypeFilter)
    .sort((firstEvent, secondEvent) => {
      const dateDifference = getEventTimestamp(firstEvent) - getEventTimestamp(secondEvent);

      return sortDirection === "asc" ? dateDifference : -dateDifference;
    });
}

export function LandingPage() {
  const [facultyFilter, setFacultyFilter] = useState<FacultyFilter>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<EventTypeFilter>("all");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const filteredEvents = getFilteredEvents(facultyFilter, eventTypeFilter, sortDirection);
  const pageCount = Math.max(1, Math.ceil(filteredEvents.length / EVENTS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const firstVisibleEventIndex = (currentPage - 1) * EVENTS_PER_PAGE;
  const visibleEvents = filteredEvents.slice(
    firstVisibleEventIndex,
    firstVisibleEventIndex + EVENTS_PER_PAGE,
  );

  return (
    <Box bg="surface.canvas" color="text.default">
      <Stack gap={{ base: 8, md: 10 }}>
        <Box as="section" aria-labelledby="landing-title">
          <SimpleGrid columns={{ base: 1, lg: 2 }} gap={{ base: 7, lg: 10 }} alignItems="center">
            <Stack gap={6}>
              <HStack gap={3} wrap="wrap">
                <Badge colorPalette="red" px={4} py={2} rounded="full" variant="subtle">
                  Agenda publica UTP
                </Badge>
                <Badge colorPalette="orange" px={4} py={2} rounded="full" variant="surface">
                  Eventos disponibles
                </Badge>
              </HStack>
              <Stack gap={4}>
                <Heading
                  as="h1"
                  color="text.default"
                  fontFamily="heading"
                  fontSize={{ base: "4xl", md: "6xl" }}
                  id="landing-title"
                  lineHeight="0.95"
                >
                  Descubre eventos academicos en SIPEG
                </Heading>
                <Text color="text.muted" fontSize={{ base: "lg", md: "xl" }} maxW="2xl">
                  Explora conferencias, talleres, seminarios y charlas de la Universidad Tecnologica
                  de Panama centro regional de Veraguas en un solo calendario publico.
                </Text>
              </Stack>
              <HStack gap={5} wrap="wrap">
                <Box>
                  <Text color="accent.solid" fontFamily="heading" fontSize="4xl" fontWeight="700">
                    {smallEvents.length}
                  </Text>
                  <Text color="text.muted" fontSize="sm" fontWeight="800">
                    eventos publicados
                  </Text>
                </Box>
                <Box borderLeftColor="border.subtle" borderLeftWidth="1px" pl={5}>
                  <Text color="accent.solid" fontFamily="heading" fontSize="4xl" fontWeight="700">
                    {faculties.length}
                  </Text>
                  <Text color="text.muted" fontSize="sm" fontWeight="800">
                    facultades
                  </Text>
                </Box>
              </HStack>
            </Stack>
            <Box
              bg="surface.raised"
              borderColor="border.subtle"
              borderWidth="1px"
              overflow="hidden"
              p={{ base: 3, md: 4 }}
              rounded="3xl"
              shadow="0 30px 90px rgba(65, 31, 20, 0.16)"
            >
              <Image
                alt="Ilustracion de una agenda academica digital para eventos UTP"
                aspectRatio="4 / 3"
                objectFit="cover"
                rounded="2xl"
                src={heroImageSource}
                w="full"
              />
            </Box>
          </SimpleGrid>
        </Box>

        <EventFilters
          currentPage={page}
          eventTypeFilter={eventTypeFilter}
          facultyFilter={facultyFilter}
          filteredCount={filteredEvents.length}
          onEventTypeChange={(filter) => {
            startTransition(() => {
              setEventTypeFilter(filter);
              setPage(1);
            });
          }}
          onFacultyChange={(filter) => {
            startTransition(() => {
              setFacultyFilter(filter);
              setPage(1);
            });
          }}
          onSortDirectionChange={(direction) => {
            startTransition(() => {
              setSortDirection(direction);
              setPage(1);
            });
          }}
          sortDirection={sortDirection}
        />

        <Box as="section" aria-labelledby="events-title">
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
                  Calendario publico
                </Text>
                <Heading
                  as="h2"
                  color="text.default"
                  fontFamily="heading"
                  fontSize={{ base: "3xl", md: "4xl" }}
                  id="events-title"
                >
                  Eventos disponibles
                </Heading>
              </Box>
              <Text color="text.muted" fontWeight="700">
                Pagina {currentPage} de {pageCount} · maximo {EVENTS_PER_PAGE} por pagina
              </Text>
            </Flex>

            {visibleEvents.length > 0 ? (
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={5}>
                {visibleEvents.map((event) => (
                  <EventCard
                    classroom={classrooms.find((classroom) => classroom.id === event.classroomId)}
                    event={event}
                    faculty={faculties.find((faculty) => faculty.id === event.facultyId)}
                    key={event.id}
                    parentEvent={largeEvents.find(
                      (largeEvent) => largeEvent.id === event.parentEventId,
                    )}
                  />
                ))}
              </SimpleGrid>
            ) : (
              <Box
                bg="surface.raised"
                borderColor="border.subtle"
                borderWidth="1px"
                p={{ base: 5, md: 8 }}
                rounded="3xl"
              >
                <Text color="text.default" fontFamily="heading" fontSize="2xl" fontWeight="700">
                  No hay eventos con esos filtros
                </Text>
                <Text color="text.muted" mt={2}>
                  Cambia la facultad o el tipo de evento para ver mas opciones disponibles.
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
    </Box>
  );
}

export default LandingPage;
