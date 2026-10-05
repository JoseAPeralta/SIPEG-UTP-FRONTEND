import {
  Badge,
  Box,
  Button,
  Field,
  HStack,
  NativeSelect,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { Link as RouterLink } from "react-router";

import {
  AsyncStateView,
  FeedbackState,
  PaginationControls,
  SectionHeader,
  StatusPanel,
  Surface,
} from "@/components";
import { formatDateTime } from "@/utils/dateFormatting";

import { useAlertsInbox } from "../hooks/useAlertsInbox";
import { ALERT_TYPES, type Alert, type AlertFilters, type AlertType } from "../model/alert";
import { alertReadStateLabels, alertTypeLabels } from "../model/alertLabels";
import type { AlertDestination } from "../model/alertNavigation";

type ReadFilter = "all" | "read" | "unread";

const READ_FILTER_OPTIONS: readonly { label: string; value: ReadFilter }[] = [
  { label: "Todas", value: "all" },
  { label: "Sin leer", value: "unread" },
  { label: "Leídas", value: "read" },
];

function AlertListItem({
  alert,
  destination,
  isUpdating,
  onMarkRead,
}: {
  alert: Alert;
  destination: AlertDestination | undefined;
  isUpdating: boolean;
  onMarkRead: (alert: Alert) => void;
}) {
  return (
    <Surface padding="normal">
      <Stack gap={2}>
        <HStack justify="space-between" wrap="wrap">
          <Text color="text.default" fontFamily="heading" fontSize="lg" fontWeight="700">
            {alertTypeLabels[alert.type]}
          </Text>
          <Badge colorPalette={alert.isRead ? "gray" : "terracotta"} rounded="full">
            {alert.isRead ? alertReadStateLabels.read : alertReadStateLabels.unread}
          </Badge>
        </HStack>
        <Text color="text.muted" fontSize="sm">
          {formatDateTime(alert.createdAt)}
        </Text>
        <HStack gap={3} wrap="wrap">
          {destination ? (
            <Button
              asChild
              colorPalette="terracotta"
              rounded="full"
              variant="outline"
              w="fit-content"
            >
              <RouterLink to={destination.to}>{destination.label}</RouterLink>
            </Button>
          ) : null}
          {!alert.isRead ? (
            <Button
              colorPalette="terracotta"
              disabled={isUpdating}
              onClick={() => onMarkRead(alert)}
              rounded="full"
              variant="solid"
              w="fit-content"
            >
              Marcar como leída
            </Button>
          ) : null}
        </HStack>
      </Stack>
    </Surface>
  );
}

/**
 * Bandeja privada de la sesion.
 *
 * Los filtros y la pagina son estado de la vista; el hook resuelve listado, destinos y acciones de
 * lectura. Un fallo del descubrimiento de permisos no oculta las alertas: se muestran sin enlaces y
 * con reintento. Marcar como leida es optimista: el anuncio confirma el exito y un fallo restaura la
 * tarjeta con un mensaje localizado, mientras el foco pasa a la lista o al estado vacio para que la
 * tarjeta retirada no lo deje en el `body`.
 */
export function AlertsInboxView() {
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [typeFilter, setTypeFilter] = useState<"" | AlertType>("");
  const [page, setPage] = useState(1);
  const [readOutcome, setReadOutcome] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const listRef = useRef<HTMLElement | null>(null);
  const emptyRef = useRef<HTMLDivElement | null>(null);

  const filters: AlertFilters = {
    ...(readFilter === "all" ? {} : { isRead: readFilter === "read" }),
    ...(typeFilter ? { type: typeFilter } : {}),
  };
  const inbox = useAlertsInbox(filters, page);

  const items = inbox.page?.items ?? [];
  const hasFilters = readFilter !== "all" || typeFilter !== "";

  useEffect(() => {
    if (focusRequest === 0) return;

    (listRef.current ?? emptyRef.current)?.focus();
  }, [focusRequest]);

  function updateReadFilter(value: ReadFilter) {
    setReadFilter(value);
    setPage(1);
  }

  function updateTypeFilter(value: "" | AlertType) {
    setTypeFilter(value);
    setPage(1);
  }

  async function markRead(alert: Alert) {
    setReadOutcome(null);
    const succeeded = await inbox.markRead(alert);

    if (!succeeded) return;

    setReadOutcome("Alerta marcada como leída.");
    setFocusRequest((value) => value + 1);
  }

  async function markAllRead() {
    setReadOutcome(null);
    const result = await inbox.markAllRead();

    if (!result) return;

    setReadOutcome(
      result.updatedCount === 0
        ? "No había alertas sin leer."
        : result.updatedCount === 1
          ? "Se marcó 1 alerta como leída."
          : `Se marcaron ${result.updatedCount} alertas como leídas.`,
    );
  }

  return (
    <Stack gap={6}>
      <HStack align="start" gap={4} justify="space-between" wrap="wrap">
        <SectionHeader
          title="Mis alertas"
          description="Revise las novedades de su cuenta. Los enlaces solo aparecen cuando existe un destino autorizado."
        />
        <Button
          colorPalette="terracotta"
          disabled={inbox.isUpdating}
          onClick={() => void markAllRead()}
          rounded="full"
          variant="solid"
        >
          Marcar todas como leídas
        </Button>
      </HStack>

      <Surface padding="normal">
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          <Field.Root>
            <Field.Label>Estado</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                onChange={(event) => updateReadFilter(event.target.value as ReadFilter)}
                value={readFilter}
              >
                {READ_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect.Field>
            </NativeSelect.Root>
          </Field.Root>
          <Field.Root>
            <Field.Label>Tipo</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                onChange={(event) => updateTypeFilter(event.target.value as "" | AlertType)}
                value={typeFilter}
              >
                <option value="">Todos</option>
                {ALERT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {alertTypeLabels[type]}
                  </option>
                ))}
              </NativeSelect.Field>
            </NativeSelect.Root>
          </Field.Root>
        </SimpleGrid>
      </Surface>

      {inbox.accessError ? (
        <Surface padding="normal">
          <HStack justify="space-between" wrap="wrap">
            <Text color="text.default" role="status">
              No se pudo comprobar el acceso a los destinos. Las alertas se muestran sin enlaces.
            </Text>
            <Button
              colorPalette="terracotta"
              onClick={() => void inbox.refetchAccess()}
              rounded="full"
              variant="outline"
            >
              Reintentar verificación
            </Button>
          </HStack>
        </Surface>
      ) : null}

      {inbox.readError ? (
        <StatusPanel role="alert">
          No se pudo actualizar el estado de lectura. La bandeja se restauró; intente de nuevo.
        </StatusPanel>
      ) : null}

      {readOutcome ? <StatusPanel>{readOutcome}</StatusPanel> : null}

      <AsyncStateView
        error={inbox.error}
        isLoading={inbox.isLoading}
        onRetry={() => void inbox.refetch()}
      >
        {items.length === 0 ? (
          <Box aria-label="Resultado de alertas" ref={emptyRef} role="group" tabIndex={-1}>
            <FeedbackState
              description={
                hasFilters
                  ? "Ajuste los filtros para consultar otras alertas."
                  : "Cuando SIPEG registre una novedad para su cuenta, aparecerá aquí."
              }
              title={
                hasFilters ? "No hay alertas que coincidan con los filtros" : "No tienes alertas"
              }
            />
          </Box>
        ) : (
          <Stack
            aria-label="Lista de alertas"
            as="ul"
            gap={4}
            listStyle="none"
            m={0}
            p={0}
            ref={(node: HTMLElement | null) => {
              listRef.current = node;
            }}
            tabIndex={-1}
          >
            {items.map((alert) => (
              <Box as="li" key={alert.id}>
                <AlertListItem
                  alert={alert}
                  destination={inbox.destinations.get(alert.id)}
                  isUpdating={inbox.isUpdating}
                  onMarkRead={(candidate) => void markRead(candidate)}
                />
              </Box>
            ))}
          </Stack>
        )}
        <PaginationControls
          currentPage={inbox.page?.page ?? page}
          itemLabel="alertas"
          onPageChange={setPage}
          pageCount={inbox.page?.totalPages ?? 1}
          pageSize={inbox.page?.limit ?? 20}
          totalItems={inbox.page?.total ?? 0}
        />
      </AsyncStateView>
    </Stack>
  );
}
