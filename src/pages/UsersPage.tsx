import { Badge, Box, HStack, SimpleGrid, Text } from "@chakra-ui/react";

import { AsyncStateView, ModuleShell, Surface } from "@/components";
import { globalRoleLabels, useUsersOverview } from "@/features/users";

export function UsersPage() {
  const { error, isLoading, rows } = useUsersOverview();

  return (
    <ModuleShell
      description="Base visual para crear usuarios, seleccionar unidad y carrera, modificar datos y asignar permisos por programa o actividad."
      headingLabel="Administracion"
      title="Usuarios y permisos"
    >
      <AsyncStateView error={error} isLoading={isLoading}>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={5}>
          {rows.map((row) => (
            <Surface
              display="flex"
              flexDirection="column"
              gap={4}
              key={row.user.id}
              padding="normal"
            >
              <HStack justify="space-between" wrap="wrap">
                <Badge colorPalette="terracotta" rounded="full" variant="subtle">
                  {globalRoleLabels[row.user.globalRole]}
                </Badge>
                <Text color="text.muted" fontSize="sm" fontWeight="800">
                  {row.unitLabel ?? "Sin unidad"}
                </Text>
              </HStack>
              <Box>
                <Text color="text.default" fontFamily="heading" fontSize="3xl" fontWeight="700">
                  {row.user.firstName} {row.user.lastName}
                </Text>
                <Text color="text.muted">{row.user.email}</Text>
              </Box>
              <Text color="text.default" fontWeight="700">
                {row.careerName ?? "Carrera pendiente"}
              </Text>
            </Surface>
          ))}
        </SimpleGrid>
      </AsyncStateView>
    </ModuleShell>
  );
}

export default UsersPage;
