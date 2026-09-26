import { Badge, Box, HStack, SimpleGrid, Text } from "@chakra-ui/react";

import { AsyncStateView, ModuleShell, Surface } from "@/components";
import { classroomTypeLabels, useClassroomsOverview } from "@/features/classrooms";

const amenityLabels: Record<string, string> = {
  desks: "Escritorios",
  projector: "Proyector",
  "smart-board": "Smart board",
  tables: "Mesas",
  whiteboard: "Pizarra",
};

export function ClassroomsPage() {
  const { classrooms, error, isLoading } = useClassroomsOverview();

  return (
    <ModuleShell
      description="Inventario de aulas y laboratorios con capacidad, amenidades y ubicacion para la planificacion de actividades."
      headingLabel="Inventario"
      title="Aulas disponibles"
    >
      <AsyncStateView error={error} isLoading={isLoading}>
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={5}>
          {classrooms.map((classroom) => (
            <Surface
              display="flex"
              flexDirection="column"
              gap={5}
              key={classroom.id}
              padding="normal"
            >
              <HStack justify="space-between">
                <Badge
                  colorPalette={classroom.type === "LABORATORY" ? "terracotta" : "gray"}
                  rounded="full"
                  variant="subtle"
                >
                  {classroomTypeLabels[classroom.type]}
                </Badge>
                <Text color="accent.solid" fontWeight="900">
                  {classroom.capacity} pax
                </Text>
              </HStack>
              <Box>
                <Text color="text.default" fontFamily="heading" fontSize="3xl" fontWeight="700">
                  {classroom.name}
                </Text>
                <Text color="text.muted" mt={2}>
                  {[classroom.building, classroom.floor ? `Piso ${classroom.floor}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </Box>
              <HStack gap={2} wrap="wrap">
                {classroom.amenities.map((amenity) => (
                  <Badge key={amenity} rounded="full" variant="surface">
                    {amenityLabels[amenity] ?? amenity}
                  </Badge>
                ))}
              </HStack>
            </Surface>
          ))}
        </SimpleGrid>
      </AsyncStateView>
    </ModuleShell>
  );
}

export default ClassroomsPage;
