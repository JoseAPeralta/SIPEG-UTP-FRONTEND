import { Box, SimpleGrid, Stack } from "@chakra-ui/react";

import {
  AsyncStateView,
  FeedbackState,
  MetricCard,
  ModuleShell,
  PaginationControls,
  SectionHeader,
} from "@/components";

import { useActivityCatalogPage } from "../hooks/useActivityCatalogPage";
import { ActivityCard } from "./ActivityCard";
import { ActivityFilters } from "./ActivityFilters";
import { EventProgramCard } from "./EventProgramCard";

export function ActivityCatalogView() {
  const page = useActivityCatalogPage();

  return (
    <ModuleShell
      description="Organice programas de eventos, filtre actividades y defina el contexto de trabajo usado por asistencia, certificados y reportes."
      headingLabel="Agenda institucional"
      title="Actividades academicas"
    >
      <AsyncStateView error={page.error} isLoading={page.isLoading} onRetry={page.refetch}>
        <Stack gap={{ base: 6, md: 8 }}>
          <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} gap={5}>
            <MetricCard
              appearance="summary"
              detail="Programas que agrupan la agenda institucional."
              label="programas"
              value={String(page.summary?.programCount ?? 0)}
            />
            <MetricCard
              appearance="summary"
              detail="Actividades con aula, horario y expositores."
              label="actividades"
              value={String(page.summary?.activityCount ?? 0)}
            />
            <MetricCard
              appearance="summary"
              detail="El listado no incluye un total de inscripciones; el detalle si lo expone."
              label="personas registradas"
              value={String(page.summary?.enrolledCount ?? "No disponible")}
            />
            <MetricCard
              appearance="summary"
              detail="Unidades organizativas cubiertas."
              label="unidades"
              value={String(page.summary?.unitCount ?? 0)}
            />
          </SimpleGrid>

          <Box as="section" aria-labelledby="programs-title">
            <Stack gap={4}>
              <SectionHeader id="programs-title" title="Programas de eventos" />
              <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={5}>
                {page.programSummaries.map((summary) => (
                  <EventProgramCard
                    isSelected={
                      page.workingContext?.kind === "eventProgram" &&
                      page.workingContext.id === summary.program.id
                    }
                    key={summary.program.id}
                    onSelect={(program) =>
                      page.onSelectContext({ id: program.id, kind: "eventProgram" })
                    }
                    summary={summary}
                  />
                ))}
              </SimpleGrid>
            </Stack>
          </Box>

          <ActivityFilters
            filteredCount={page.filteredCount}
            onClearFilters={page.onClearFilters}
            onProgramFilterChange={page.onProgramFilterChange}
            onSearchTermChange={page.onSearchTermChange}
            onSortDirectionChange={page.onSortDirectionChange}
            onTypeFilterChange={page.onTypeFilterChange}
            onUnitFilterChange={page.onUnitFilterChange}
            programFilter={page.programFilter}
            programOptions={page.programOptions}
            searchTerm={page.searchTerm}
            sortDirection={page.sortDirection}
            typeFilter={page.typeFilter}
            unitFilter={page.unitFilter}
            unitOptions={page.unitOptions}
          />

          <Box as="section" aria-labelledby="activities-title">
            <Stack gap={5}>
              <SectionHeader
                id="activities-title"
                status={
                  page.selectedScope
                    ? `Contexto activo: ${page.selectedScope.label}`
                    : "Sin contexto de trabajo seleccionado"
                }
                title="Catalogo de actividades"
              />

              {page.pagination.rows.length > 0 ? (
                <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={5}>
                  {page.pagination.rows.map((row) => (
                    <ActivityCard
                      activity={row.activity}
                      classroom={row.classroom}
                      isSelected={
                        page.workingContext?.kind === "activity" &&
                        page.workingContext.id === row.activity.id
                      }
                      key={row.activity.id}
                      onSelect={(activity) =>
                        page.onSelectContext({ id: activity.id, kind: "activity" })
                      }
                      program={row.program}
                      unit={row.unit}
                    />
                  ))}
                </SimpleGrid>
              ) : (
                <FeedbackState
                  description="Cambie la unidad, el tipo o el programa para ver mas opciones disponibles."
                  padding="roomy"
                  title="No hay actividades con esos filtros"
                />
              )}

              <PaginationControls
                currentPage={page.pagination.currentPage}
                itemLabel="actividades"
                onPageChange={page.onPageChange}
                pageCount={page.pagination.pageCount}
                pageSize={page.pageSize}
                totalItems={page.filteredCount}
              />
            </Stack>
          </Box>
        </Stack>
      </AsyncStateView>
    </ModuleShell>
  );
}
