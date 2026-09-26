import { Badge, Box, Heading, HStack, Image, SimpleGrid, Stack, Text } from "@chakra-ui/react";

import {
  AsyncStateView,
  FeedbackState,
  PaginationControls,
  SectionHeader,
  Surface,
} from "@/components";
import { ActivityCard, ActivityFilters, usePublicActivities } from "@/features/activity-catalog";

const heroImageSource = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 720" role="img" aria-label="Agenda academica SIPEG">
  <defs>
    <linearGradient id="sky" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#6E2411"/>
      <stop offset="0.52" stop-color="#9C3A1E"/>
      <stop offset="1" stop-color="#E59A72"/>
    </linearGradient>
    <radialGradient id="glow" cx="68%" cy="22%" r="58%">
      <stop offset="0" stop-color="#FBF7F2" stop-opacity="0.82"/>
      <stop offset="1" stop-color="#FBF7F2" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="960" height="720" rx="52" fill="url(#sky)"/>
  <rect width="960" height="720" rx="52" fill="url(#glow)"/>
  <g fill="none" stroke="#FBF7F2" stroke-opacity="0.42" stroke-width="2">
    <path d="M112 126h736M112 252h736M112 378h736M112 504h736M236 82v568M420 82v568M604 82v568M788 82v568"/>
  </g>
  <g transform="translate(118 116)">
    <rect width="720" height="454" rx="40" fill="#FFFDF9" fill-opacity="0.92"/>
    <rect x="44" y="54" width="632" height="58" rx="20" fill="#6E2411" fill-opacity="0.12"/>
    <rect x="44" y="148" width="270" height="208" rx="28" fill="#9C3A1E"/>
    <rect x="350" y="148" width="326" height="92" rx="26" fill="#F3EAE2"/>
    <rect x="350" y="264" width="326" height="92" rx="26" fill="#F3EAE2"/>
    <circle cx="116" cy="252" r="42" fill="#E59A72"/>
    <path d="M178 226h86M178 254h62M178 282h96" stroke="#FBF7F2" stroke-linecap="round" stroke-width="18"/>
    <path d="M394 180h132M394 216h216M394 296h132M394 332h192" stroke="#6E2411" stroke-linecap="round" stroke-opacity="0.72" stroke-width="16"/>
    <text x="58" y="94" fill="#6E2411" font-family="Georgia, serif" font-size="42" font-weight="700">SIPEG</text>
    <text x="518" y="94" fill="#9C3A1E" font-family="Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="4">AGENDA ACADEMICA</text>
  </g>
</svg>`)} `;

export function LandingPage() {
  const page = usePublicActivities();

  return (
    <Box bg="surface.canvas" color="text.default">
      <Stack gap={{ base: 8, md: 10 }}>
        <Box as="section" aria-labelledby="landing-title">
          <SimpleGrid columns={{ base: 1, lg: 2 }} gap={{ base: 7, lg: 10 }} alignItems="center">
            <Stack gap={6}>
              <HStack gap={3} wrap="wrap">
                <Badge colorPalette="terracotta" px={4} py={2} rounded="full" variant="subtle">
                  Agenda publica
                </Badge>
                <Badge colorPalette="terracotta" px={4} py={2} rounded="full" variant="surface">
                  Actividades disponibles
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
                  Descubre actividades academicas en SIPEG
                </Heading>
                <Text color="text.muted" fontSize={{ base: "lg", md: "xl" }} maxW="2xl">
                  Explora talleres, seminarios, charlas y otras actividades academicas en un solo
                  calendario publico.
                </Text>
              </Stack>
              <HStack gap={5} wrap="wrap">
                <Box>
                  <Text color="accent.solid" fontFamily="heading" fontSize="4xl" fontWeight="700">
                    {page.summary ? page.summary.activityCount : "..."}
                  </Text>
                  <Text color="text.muted" fontSize="sm" fontWeight="800">
                    actividades publicadas
                  </Text>
                </Box>
                <Box borderLeftColor="border.subtle" borderLeftWidth="1px" pl={5}>
                  <Text color="accent.solid" fontFamily="heading" fontSize="4xl" fontWeight="700">
                    {page.summary ? page.summary.unitCount : "..."}
                  </Text>
                  <Text color="text.muted" fontSize="sm" fontWeight="800">
                    unidades organizativas
                  </Text>
                </Box>
              </HStack>
            </Stack>
            <Surface elevation="overlay" overflow="hidden" padding="tight">
              <Image
                alt="Ilustracion de una agenda academica digital de actividades"
                aspectRatio="4 / 3"
                objectFit="cover"
                rounded="2xl"
                src={heroImageSource}
                w="full"
              />
            </Surface>
          </SimpleGrid>
        </Box>

        <AsyncStateView error={page.error} isLoading={page.isLoading} onRetry={page.refetch}>
          <Stack gap={6}>
            <ActivityFilters
              filteredCount={page.filteredCount}
              onSortDirectionChange={page.onSortDirectionChange}
              onTypeFilterChange={page.onTypeFilterChange}
              onUnitFilterChange={page.onUnitFilterChange}
              sortDirection={page.sortDirection}
              typeFilter={page.typeFilter}
              unitFilter={page.unitFilter}
              unitOptions={page.unitOptions}
            />

            <Box as="section" aria-labelledby="public-activities-title">
              <Stack gap={5}>
                <SectionHeader
                  headingLabel="Calendario publico"
                  id="public-activities-title"
                  title="Actividades disponibles"
                />

                {page.pagination.rows.length > 0 ? (
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={5}>
                    {page.pagination.rows.map((row) => (
                      <ActivityCard
                        activity={row.activity}
                        classroom={row.classroom}
                        key={row.activity.id}
                        program={row.program}
                        unit={row.unit}
                      />
                    ))}
                  </SimpleGrid>
                ) : (
                  <FeedbackState
                    description="Cambia la unidad o el tipo de actividad para ver mas opciones disponibles."
                    padding="roomy"
                    title="No hay actividades con esos filtros"
                  />
                )}

                <PaginationControls
                  currentPage={page.pagination.currentPage}
                  itemLabel="actividades"
                  onPageChange={page.onPageChange}
                  pageCount={page.pagination.pageCount}
                  totalItems={page.filteredCount}
                  visibleItems={page.pagination.rows.length}
                />
              </Stack>
            </Box>
          </Stack>
        </AsyncStateView>
      </Stack>
    </Box>
  );
}

export default LandingPage;
