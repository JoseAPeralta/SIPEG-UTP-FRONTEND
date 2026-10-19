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

import { Surface } from "@/components/publicUi";
import {
  institutionalUnitFilterOptions,
  organizationalUnitTypeLabels,
} from "@/features/organizational-units/public";

import {
  publicActivityTypeOptions,
  type ActivityTypeFilter,
  type PublicActivityRow,
  type PublicCatalogPeriod,
  type SortDirection,
  type UnitFilter,
  type UnitTypeFilter,
} from "../model/publicCatalogSelectors";

const SEARCH_MAX_LENGTH = 80;

const periodOptions: readonly { id: PublicCatalogPeriod; label: string }[] = [
  { id: "available", label: "Disponibles" },
  { id: "upcoming", label: "Próximas" },
  { id: "past", label: "Pasadas" },
  { id: "all", label: "Todas" },
];

const unitTypeOptions: readonly { id: UnitTypeFilter; label: string }[] = (
  Object.keys(organizationalUnitTypeLabels) as (keyof typeof organizationalUnitTypeLabels)[]
).map((type) => ({ id: type, label: organizationalUnitTypeLabels[type] }));

export type PublicActivityFiltersProps = {
  filteredCount: number;
  onClearFilters: () => void;
  onPeriodChange: (value: PublicCatalogPeriod) => void;
  onProgramFilterChange: (value: string) => void;
  onSearchTermChange: (value: string) => void;
  onSortDirectionChange: (value: SortDirection) => void;
  onTypeFilterChange: (value: ActivityTypeFilter) => void;
  onUnitFilterChange: (value: UnitFilter) => void;
  onUnitTypeFilterChange: (value: UnitTypeFilter) => void;
  period: PublicCatalogPeriod;
  programFilter: string;
  programOptions: readonly { id: string; label: string }[];
  rows: readonly PublicActivityRow[];
  searchTerm: string;
  sortDirection: SortDirection;
  typeFilter: ActivityTypeFilter;
  unitFilter: UnitFilter;
  unitTypeFilter: UnitTypeFilter;
};

/**
 * Filtros de la agenda publica.
 *
 * Componente controlado: cada control refleja la prop y delega el cambio al
 * callback, de modo que el hook de la agenda conserva el estado y la pagina.
 * Las unidades y los tipos salen del registro institucional y de las etiquetas
 * de dominio, no de una consulta: la agenda ya no los descarga. Solo se ofrece
 * una unidad si hay al menos una actividad que la respete, para no presentar un
 * filtro que no acorta nada.
 */
export function PublicActivityFilters({
  filteredCount,
  onClearFilters,
  onPeriodChange,
  onProgramFilterChange,
  onSearchTermChange,
  onSortDirectionChange,
  onTypeFilterChange,
  onUnitFilterChange,
  onUnitTypeFilterChange,
  period,
  programFilter,
  programOptions,
  rows,
  searchTerm,
  sortDirection,
  typeFilter,
  unitFilter,
  unitTypeFilter,
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
              Filtre la agenda academica
            </Text>
          </Box>
          <Badge colorPalette="terracotta" px={4} py={2} rounded="full" variant="surface">
            {filteredCount} resultados
          </Badge>
        </Flex>
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
          <Field.Root>
            <Field.Label htmlFor="public-activity-period-filter">Periodo</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                id="public-activity-period-filter"
                minH="44px"
                onChange={(event) => onPeriodChange(event.target.value as PublicCatalogPeriod)}
                value={period}
              >
                {periodOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>
          <Field.Root>
            <Field.Label htmlFor="public-activity-search">Buscar actividades</Field.Label>
            <Input
              id="public-activity-search"
              maxLength={SEARCH_MAX_LENGTH}
              minH="44px"
              onChange={(event) => onSearchTermChange(event.target.value)}
              placeholder="Nombre, expositor, aula o programa"
              value={searchTerm}
            />
          </Field.Root>
          <Field.Root>
            <Field.Label htmlFor="public-activity-unit-type-filter">Tipo de unidad</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                id="public-activity-unit-type-filter"
                minH="44px"
                onChange={(event) => onUnitTypeFilterChange(event.target.value as UnitTypeFilter)}
                value={unitTypeFilter}
              >
                <option value="all">Todos los tipos</option>
                {unitTypeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>
          <Field.Root>
            <Field.Label htmlFor="public-activity-program-filter">Programa</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                id="public-activity-program-filter"
                minH="44px"
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
          <Field.Root>
            <Field.Label htmlFor="public-activity-unit-filter">Unidad organizativa</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                id="public-activity-unit-filter"
                minH="44px"
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
                minH="44px"
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
                minH="44px"
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
        <Button
          alignSelf="start"
          colorPalette="terracotta"
          minH="44px"
          onClick={onClearFilters}
          rounded="full"
          variant="outline"
        >
          Limpiar filtros
        </Button>
      </Stack>
    </Surface>
  );
}
