import { Badge, Box, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";

import { ModuleShell } from "@components/ModuleShell";
import { classrooms } from "@/data/sipeg";

const amenityLabels: Record<string, string> = {
  desks: "Escritorios",
  projector: "Proyector",
  "smart-board": "Smart board",
  tables: "Mesas",
  whiteboard: "Pizarra",
};

export function ClassroomsPage() {
  return (
    <ModuleShell
      description="Inventario frontend de aulas y laboratorios con capacidad, amenidades y ventanas de disponibilidad para la planificacion de eventos pequenos."
      eyebrow="Inventario"
      title="Aulas disponibles"
    >
      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={5}>
        {classrooms.map((classroom) => (
          <Stack
            bg="surface.raised"
            borderColor="border.subtle"
            borderWidth="1px"
            gap={5}
            key={classroom.id}
            p={6}
            rounded="3xl"
          >
            <HStack justify="space-between">
              <Badge
                colorPalette={classroom.type === "laboratory" ? "terracotta" : "gray"}
                rounded="full"
                variant="subtle"
              >
                {classroom.type === "laboratory" ? "Laboratorio" : "Aula"}
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
                {classroom.availableDays.join(", ")} · {classroom.availableHours}
              </Text>
            </Box>
            <HStack gap={2} wrap="wrap">
              {classroom.amenities.map((amenity) => (
                <Badge key={amenity} rounded="full" variant="surface">
                  {amenityLabels[amenity] ?? amenity}
                </Badge>
              ))}
            </HStack>
          </Stack>
        ))}
      </SimpleGrid>
    </ModuleShell>
  );
}

export default ClassroomsPage;
