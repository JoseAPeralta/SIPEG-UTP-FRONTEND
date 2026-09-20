import { Badge, Box, Field, Flex, HStack, NativeSelect, Text } from "@chakra-ui/react";
import type { ChangeEvent } from "react";
import { NavLink } from "react-router";

import { useSelectedEventStore } from "@/store/selectedEvent";
import { getAdminEventOptions, getSelectedEventLabel } from "@utils/adminEventSelection";

const menuOptions = [
  { label: "Eventos", path: "/admin/eventos" },
  { label: "Asistencia", path: "/admin/asistencia" },
  { label: "Certificados", path: "/admin/certificados" },
  { label: "Reportes", path: "/admin/reportes" },
] as const;

const eventOptions = getAdminEventOptions();

export function AdminMenu() {
  const selectedEventId = useSelectedEventStore((state) => state.selectedEventId);
  const setSelectedEventId = useSelectedEventStore((state) => state.setSelectedEventId);
  const selectedEventLabel = getSelectedEventLabel(selectedEventId);

  const handleEventChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextEventId = event.target.value;

    setSelectedEventId(nextEventId === "" ? null : nextEventId);
  };

  return (
    <Box
      as="section"
      bg="surface.raised"
      borderBottomColor="border.subtle"
      borderBottomWidth="1px"
      py={4}
    >
      <Flex
        align={{ base: "stretch", md: "end" }}
        gap={{ base: 4, md: 6 }}
        justify="space-between"
        maxW="7xl"
        mx="auto"
        px={{ base: 4, md: 6 }}
        wrap="wrap"
      >
        <Box flex={{ base: "1 1 100%", md: "0 1 420px" }}>
          <Field.Root>
            <Field.Label htmlFor="admin-event-select">Evento de trabajo</Field.Label>
            <NativeSelect.Root size="sm">
              <NativeSelect.Field
                id="admin-event-select"
                onChange={handleEventChange}
                value={selectedEventId ?? ""}
              >
                <option value="">Todos los eventos</option>
                <optgroup label="Eventos grandes">
                  {eventOptions
                    .filter((event) => event.type === "large")
                    .map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.label}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Eventos pequenos">
                  {eventOptions
                    .filter((event) => event.type === "small")
                    .map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.label}
                      </option>
                    ))}
                </optgroup>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>
          <Text color="text.muted" fontSize="sm" mt={2}>
            {selectedEventLabel
              ? `Las opciones del panel usan: ${selectedEventLabel}`
              : "Eventos muestra la agenda general; el resto requiere seleccionar un evento."}
          </Text>
        </Box>

        <HStack as="nav" aria-label="Navegacion del panel" gap={2} justify="end" wrap="wrap">
          {menuOptions.map((option) => (
            <NavLink end key={option.path} style={{ textDecoration: "none" }} to={option.path}>
              {({ isActive }) => (
                <Box
                  bg={isActive ? "accent.solid" : "transparent"}
                  borderColor={isActive ? "accent.solid" : "border.subtle"}
                  borderWidth="1px"
                  color={isActive ? "accent.contrast" : "text.default"}
                  fontSize="sm"
                  fontWeight="800"
                  px={4}
                  py={2}
                  rounded="full"
                >
                  {option.label}
                </Box>
              )}
            </NavLink>
          ))}
        </HStack>
      </Flex>

      <Box maxW="7xl" mx="auto" mt={3} px={{ base: 4, md: 6 }}>
        <Badge
          colorPalette={selectedEventLabel ? "terracotta" : "gray"}
          rounded="full"
          variant="subtle"
        >
          {selectedEventLabel ?? "Todos los eventos"}
        </Badge>
      </Box>
    </Box>
  );
}
