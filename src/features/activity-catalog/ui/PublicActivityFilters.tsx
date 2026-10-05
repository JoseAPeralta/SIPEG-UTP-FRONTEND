import { Badge, Box, Field, Flex, NativeSelect, SimpleGrid, Stack, Text } from "@chakra-ui/react";

import { Surface } from "@/components/publicUi";
import { institutionalUnitFilterOptions } from "@/features/organizational-units/public";

import {
  publicActivityTypeOptions,
  type ActivityTypeFilter,
  type PublicActivityRow,
  type SortDirection,
  type UnitFilter,
} from "../model/publicCatalogSelectors";

export type PublicActivityFiltersProps = {
  filteredCount: number;
  onSortDirectionChange: (value: SortDirection) => void;
  onTypeFilterChange: (value: ActivityTypeFilter) => void;
  onUnitFilterChange: (value: UnitFilter) => void;
  rows: readonly PublicActivityRow[];
  sortDirection: SortDirection;
  typeFilter: ActivityTypeFilter;
  unitFilter: UnitFilter;
};

/**
 * Filtros de la agenda publica.
 *
 * Las unidades y los tipos salen del registro institucional y de las etiquetas de
 * dominio, no de una consulta: son datos que no cambian con frecuencia y la
 * agenda ya no los descarga. Solo se ofrece una unidad si hay al menos una
 * actividad que la respete, para no presentar un filtro que no acorta nada.
 */
export function PublicActivityFilters({
  filteredCount,
  onSortDirectionChange,
  onTypeFilterChange,
  onUnitFilterChange,
  rows,
  sortDirection,
  typeFilter,
  unitFilter,
}: PublicActivityFiltersProps) {
  const availableUnitCodes = new Set(rows.map((row) => row.unitCode));
  const unitOptions = institutionalUnitFilterOptions().filter((option) =>
    availableUnitCodes.has(option.id),
  );

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
          <Badge colorPalette="terracotta" px={4} py={2} rounded="full" variant="surface">
            {filteredCount} resultados
          </Badge>
        </Flex>
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
          <Field.Root>
            <Field.Label htmlFor="public-activity-unit-filter">Unidad organizativa</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                id="public-activity-unit-filter"
                onChange={(event) => onUnitFilterChange(event.target.value as UnitFilter)}
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
            <Field.Label htmlFor="public-activity-type-filter">Tipo de actividad</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                id="public-activity-type-filter"
                onChange={(event) => onTypeFilterChange(event.target.value as ActivityTypeFilter)}
                value={typeFilter}
              >
                <option value="all">Todos los tipos</option>
                {publicActivityTypeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>
          <Field.Root>
            <Field.Label htmlFor="public-activity-sort">Orden</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                id="public-activity-sort"
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
      </Stack>
    </Surface>
  );
}
