import { Badge, Field, NativeSelect, Text } from "@chakra-ui/react";

import { useWorkingContext } from "../hooks/useWorkingContext";

export function WorkingContextSelect() {
  const { isLoading, onValueChange, options, scope, value } = useWorkingContext();

  return (
    <Field.Root>
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
                {option.label}
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
