import { Badge, Box, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";

import { ModuleShell } from "@components/ModuleShell";
import { careers, faculties, users } from "@/data/sipeg";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  attendee: "Asistente",
  collaborator: "Colaborador",
  organizer: "Organizador",
  speaker: "Ponente",
};

export function UsersPage() {
  return (
    <ModuleShell
      description="Base visual para crear usuarios, seleccionar facultad y carrera, modificar datos y asignar permisos por evento sin acoplar formularios a endpoints."
      eyebrow="Administracion"
      title="Usuarios y permisos"
    >
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={5}>
        {users.map((user) => {
          const career = careers.find((candidate) => candidate.id === user.careerId);
          const faculty = faculties.find((candidate) => candidate.id === user.facultyId);

          return (
            <Stack
              bg="surface.raised"
              borderColor="border.subtle"
              borderWidth="1px"
              gap={4}
              key={user.id}
              p={6}
              rounded="3xl"
            >
              <HStack justify="space-between" wrap="wrap">
                <Badge colorPalette="red" rounded="full" variant="subtle">
                  {roleLabels[user.role] ?? user.role}
                </Badge>
                <Text color="text.muted" fontSize="sm" fontWeight="800">
                  {faculty?.shortName ?? "Sin facultad"}
                </Text>
              </HStack>
              <Box>
                <Text color="text.default" fontFamily="heading" fontSize="3xl" fontWeight="700">
                  {user.fullName}
                </Text>
                <Text color="text.muted">{user.email}</Text>
              </Box>
              <Text color="text.default" fontWeight="700">
                {career?.name ?? "Carrera pendiente"}
              </Text>
            </Stack>
          );
        })}
      </SimpleGrid>
    </ModuleShell>
  );
}

export default UsersPage;
