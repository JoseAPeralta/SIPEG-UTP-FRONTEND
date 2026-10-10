import { Badge, Button, Field, NativeSelect, Stack, Text } from "@chakra-ui/react";

import { eventProgramStatusLabels } from "@/features/event-programs";

import { useWorkingContext } from "../hooks/useWorkingContext";

export function WorkingContextSelect() {
  const { error, isLoading, onValueChange, options, refetch, scope, selectionRevoked, value } =
    useWorkingContext();

  return (
    <Field.Root invalid={Boolean(error)}>
      <Field.Label htmlFor="working-context-select">Contexto de trabajo</Field.Label>
      <NativeSelect.Root disabled={isLoading} size="sm">
        <NativeSelect.Field
          id="working-context-select"
          onChange={(event) => onValueChange(event.target.value)}
          value={value}
        >
          <option value="">Todos los programas</option>
          <optgroup label="Programas de eventos">
            {options.programs.map((option) => (
              <option key={option.id} value={`${option.kind}:${option.id}`}>
                {option.status
                  ? `${option.label} · ${eventProgramStatusLabels[option.status]}`
                  : option.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Actividades">
            {options.activities.map((option) => (
              <option key={option.id} value={`${option.kind}:${option.id}`}>
                {option.label}
              </option>
            ))}
          </optgroup>
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
      <Text color="text.muted" fontSize="sm" mt={2}>
        {scope
          ? `Las opciones del panel usan: ${scope.label}`
          : "Las demas paginas requieren seleccionar un programa o actividad."}
      </Text>
      {selectionRevoked ? (
        <Text role="status">
          El contexto seleccionado ya no está disponible; se retiró la selección. Elija otro para
          continuar.
        </Text>
      ) : null}
      {error ? (
        <Stack align="start" gap={2}>
          <Text role="alert">No se pudieron cargar los contextos de trabajo.</Text>
          <Button onClick={() => void refetch()} size="sm" variant="outline">
            Reintentar
          </Button>
        </Stack>
      ) : null}
      <Badge
        alignSelf="start"
        colorPalette={scope ? "terracotta" : "gray"}
        mt={2}
        rounded="full"
        variant="subtle"
      >
        {scope?.label ?? "Todos los programas"}
      </Badge>
    </Field.Root>
  );
}
