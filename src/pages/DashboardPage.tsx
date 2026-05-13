import { startTransition } from "react";
import { Badge, Box, Button, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";

import { EventCard } from "@components/EventCard";
import { MetricCard } from "@components/MetricCard";
import { ModuleShell } from "@components/ModuleShell";
import { classrooms, faculties, largeEvents, reportMetrics, smallEvents } from "@/data/sipeg";
import { useDashboardMetrics } from "@hooks/useDashboardMetrics";
import { useFacultyPreferenceStore } from "@store/facultyPreference";
import type { FacultyFilter } from "@utils/eventFilters";
import { getEventsForFaculty } from "@utils/eventFilters";

export function DashboardPage() {
  const selectedFacultyId = useFacultyPreferenceStore((state) => state.selectedFacultyId);
  const setSelectedFacultyId = useFacultyPreferenceStore((state) => state.setSelectedFacultyId);
  const metrics = useDashboardMetrics();
  const visibleEvents = getEventsForFaculty(smallEvents, selectedFacultyId).slice(0, 3);

  const handleFacultyChange = (facultyId: FacultyFilter) => {
    startTransition(() => setSelectedFacultyId(facultyId));
  };

  return (
    <ModuleShell
      description="Una consola editorial para priorizar eventos por facultad, preparar asistencia, revisar certificados y anticipar reportes sin mezclar responsabilidades de backend."
      eyebrow="Operacion academica"
      title="Panel operativo SIPEG"
      actions={
        <Badge colorPalette="green" px={4} py={2} rounded="full" variant="subtle">
          Frontend listo para API futura
        </Badge>
      }
    >
      <Stack gap={8}>
        <Box
          bg="surface.raised"
          borderColor="border.subtle"
          borderWidth="1px"
          p={{ base: 5, md: 6 }}
          rounded="3xl"
        >
          <Text
            color="text.muted"
            fontSize="sm"
            fontWeight="800"
            letterSpacing="0.1em"
            textTransform="uppercase"
          >
            Prioridad por facultad
          </Text>
          <HStack gap={3} mt={4} overflowX="auto" pb={1} wrap={{ base: "nowrap", md: "wrap" }}>
            <Button
              colorPalette="red"
              onClick={() => handleFacultyChange("all")}
              rounded="full"
              size="sm"
              variant={selectedFacultyId === "all" ? "solid" : "outline"}
            >
              Todas
            </Button>
            {faculties.map((faculty) => (
              <Button
                colorPalette="red"
                key={faculty.id}
                onClick={() => handleFacultyChange(faculty.id)}
                rounded="full"
                size="sm"
                variant={selectedFacultyId === faculty.id ? "solid" : "outline"}
              >
                {faculty.shortName}
              </Button>
            ))}
          </HStack>
        </Box>

        <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} gap={5}>
          <MetricCard
            detail="Eventos visibles con el filtro actual"
            label="Eventos"
            tone="red"
            value={String(metrics.visibleEvents)}
          />
          <MetricCard
            detail="Registros confirmados en QR o codigo"
            label="Asistencia"
            tone="teal"
            value={String(metrics.confirmedAttendance)}
          />
          <MetricCard
            detail="Certificados generados desde asistencia"
            label="Certificados"
            tone="amber"
            value={String(metrics.generatedCertificates)}
          />
          <MetricCard
            detail="Capacidad maxima inventariada"
            label="Aulas"
            tone="graphite"
            value={String(metrics.availableCapacity)}
          />
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, lg: 3 }} gap={5}>
          <Box gridColumn={{ base: "auto", lg: "span 2" }}>
            <Stack gap={4}>
              <Text color="text.default" fontFamily="heading" fontSize="3xl" fontWeight="700">
                Proximos eventos priorizados
              </Text>
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
                    showDashboardDetails
                  />
                ))}
              </SimpleGrid>
            </Stack>
          </Box>
          <Stack
            bg="surface.raised"
            borderColor="border.subtle"
            borderWidth="1px"
            gap={5}
            p={6}
            rounded="3xl"
          >
            <Text color="text.default" fontFamily="heading" fontSize="3xl" fontWeight="700">
              Pulso de reportes
            </Text>
            {reportMetrics.map((metric) => (
              <HStack
                borderBottomColor="border.subtle"
                borderBottomWidth="1px"
                gap={4}
                justify="space-between"
                key={metric.id}
                pb={4}
              >
                <Box>
                  <Text color="text.default" fontWeight="800">
                    {metric.label}
                  </Text>
                  <Text color="text.muted" fontSize="sm">
                    {metric.detail}
                  </Text>
                </Box>
                <Text color="accent.solid" fontFamily="heading" fontSize="2xl" fontWeight="700">
                  {metric.value}
                </Text>
              </HStack>
            ))}
          </Stack>
        </SimpleGrid>
      </Stack>
    </ModuleShell>
  );
}

export default DashboardPage;
