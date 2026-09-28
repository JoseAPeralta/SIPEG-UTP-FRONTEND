import {
  Badge,
  Box,
  Button,
  Field,
  Flex,
  Input,
  NativeSelect,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";

import { Surface } from "@/components";

import {
  activityTypeFilterOrder,
  activityTypeLabels,
  type ActivityTypeFilter,
  type ProgramFilter,
  type SelectOption,
  type SortDirection,
  type UnitFilter,
} from "../model/catalogSelectors";

export type ActivityFiltersProps = {
  filteredCount: number;
  onClearFilters?: (() => void) | undefined;
  onProgramFilterChange?: ((value: ProgramFilter) => void) | undefined;
  onSearchTermChange?: ((value: string) => void) | undefined;
  onSortDirectionChange: (value: SortDirection) => void;
  onTypeFilterChange: (value: ActivityTypeFilter) => void;
  onUnitFilterChange: (value: UnitFilter) => void;
  programFilter?: ProgramFilter | undefined;
  programOptions?: SelectOption[] | undefined;
  searchTerm?: string | undefined;
  sortDirection: SortDirection;
  typeFilter: ActivityTypeFilter;
  unitFilter: UnitFilter;
  unitOptions: SelectOption[];
};

/** Offers public filters and optional administrative search, program and reset controls. */
export function ActivityFilters({
  filteredCount,
  onClearFilters,
  onProgramFilterChange,
  onSearchTermChange,
  onSortDirectionChange,
  onTypeFilterChange,
  onUnitFilterChange,
  programFilter = "all",
  programOptions = [],
  searchTerm = "",
  sortDirection,
  typeFilter,
  unitFilter,
  unitOptions,
}: ActivityFiltersProps) {
  return (
    <Surface aria-label="Filtros de actividades" padding="normal" radius="control">
      <Stack gap={5}>
        <Flex align={{ base: "start", md: "center" }} gap={4} justify="space-between" wrap="wrap">
          <Box>
            <Text
              color="text.muted"
              fontSize="sm"
              fontWeight="800"
              letterSpacing="0.1em"
              textTransform="uppercase"
            >
              Explorar agenda
            </Text>
            <Text color="text.default" fontFamily="heading" fontSize="3xl" fontWeight="700">
              Filtre actividades disponibles
            </Text>
          </Box>
          <Badge colorPalette="terracotta" px={4} py={2} rounded="full" variant="subtle">
            {filteredCount} resultados
          </Badge>
        </Flex>
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
          {onSearchTermChange ? (
            <Field.Root>
              <Field.Label htmlFor="activity-search">Buscar actividades</Field.Label>
              <Input
                id="activity-search"
                onChange={(event) => onSearchTermChange(event.target.value)}
                placeholder="Nombre, expositor, aula o programa"
                value={searchTerm}
              />
            </Field.Root>
          ) : null}
          <Field.Root>
            <Field.Label htmlFor="activity-unit-filter">Unidad organizativa</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                id="activity-unit-filter"
                onChange={(event) => onUnitFilterChange(event.target.value)}
                value={unitFilter}
              >
                <option value="all">Todas las unidades</option>
                {unitOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>
          <Field.Root>
            <Field.Label htmlFor="activity-type-filter">Tipo de actividad</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                id="activity-type-filter"
                onChange={(event) => onTypeFilterChange(event.target.value as ActivityTypeFilter)}
                value={typeFilter}
              >
                <option value="all">Todos los tipos</option>
                {activityTypeFilterOrder.map((type) => (
                  <option key={type} value={type}>
                    {activityTypeLabels[type]}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>
          {onProgramFilterChange ? (
            <Field.Root>
              <Field.Label htmlFor="activity-program-filter">Programa de eventos</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field
                  id="activity-program-filter"
                  onChange={(event) => onProgramFilterChange(event.target.value)}
                  value={programFilter}
                >
                  <option value="all">Todos los programas</option>
                  {programOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>
          ) : null}
          <Field.Root>
            <Field.Label htmlFor="activity-sort">Orden</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                id="activity-sort"
                onChange={(event) => onSortDirectionChange(event.target.value as SortDirection)}
                value={sortDirection}
              >
                <option value="asc">Ascendente</option>
                <option value="desc">Descendente</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>
        </SimpleGrid>
        {onClearFilters ? (
          <Button
            alignSelf="start"
            colorPalette="terracotta"
            onClick={onClearFilters}
            rounded="full"
            variant="outline"
          >
            Limpiar filtros
          </Button>
        ) : null}
      </Stack>
    </Surface>
  );
}
