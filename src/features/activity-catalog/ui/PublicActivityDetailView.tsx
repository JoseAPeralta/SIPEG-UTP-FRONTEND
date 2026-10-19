import { Badge, Box, Button, Heading, Image, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import { Link as RouterLink } from "react-router";

import { AsyncStateView, FeedbackState, SectionHeader, Surface } from "@/components/publicUi";
import { formatActivityDate } from "@/utils/dateFormatting";

import { usePublicActivityDetail } from "../hooks/usePublicActivityDetail";
import {
  activityStatusLabels,
  activityTypeLabels,
  getProgramBadgeLabel,
} from "../model/catalogLabels";
import type { PublicActivityDetail } from "../model/publicActivityDetail";

export type PublicActivityDetailViewProps = {
  /** Identificador publico de la actividad que se consulta. */
  activityId: string;
};

const statusColorPalette: Record<
  PublicActivityDetail["status"],
  "neutral" | "red" | "success" | "terracotta"
> = {
  CANCELLED: "red",
  COMPLETED: "neutral",
  ONGOING: "success",
  SCHEDULED: "terracotta",
};

const CANCEL_REASON_FALLBACK = "El motivo de la cancelación no está informado.";

/**
 * El detalle publico no ofrece inscripcion: todavia no existe ese flujo. Los
 * cupos se derivan solo cuando el contrato informa la capacidad; si es `null`
 * se dice explicitamente y no se inventan numeros.
 */
function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Text
        as="dt"
        color="text.muted"
        fontSize="xs"
        fontWeight="800"
        letterSpacing="0.08em"
        textTransform="uppercase"
      >
        {label}
      </Text>
      <Text as="dd" color="text.default" fontWeight="700" mt={1}>
        {value}
      </Text>
    </Box>
  );
}

function ActivityDetail({ activity }: { activity: PublicActivityDetail }) {
  const [failedBannerUrl, setFailedBannerUrl] = useState<string | null>(null);
  const bannerUrl = activity.bannerUrl?.trim() ?? "";
  const showBanner = bannerUrl.length > 0 && failedBannerUrl !== bannerUrl;
  const description = activity.description?.trim() ?? "";
  const cancelReason = activity.cancelReason?.trim() ?? "";
  const hasSpeakers = activity.speakers.length > 0;
  const capacity = activity.capacity;
  const availableSeats = capacity === null ? null : Math.max(0, capacity - activity.enrolledCount);

  return (
    <Stack as="article" gap={{ base: 6, md: 8 }}>
      <Stack gap={3}>
        <Heading
          as="h1"
          color="text.default"
          fontFamily="heading"
          fontSize={{ base: "3xl", md: "5xl" }}
          fontWeight="700"
          lineHeight="1.05"
        >
          {activity.name}{" "}
          <Badge
            colorPalette={statusColorPalette[activity.status]}
            rounded="full"
            verticalAlign="middle"
            variant="subtle"
          >
            {activityStatusLabels[activity.status]}
          </Badge>
        </Heading>
      </Stack>

      {activity.status === "CANCELLED" ? (
        <FeedbackState
          description={cancelReason.length > 0 ? cancelReason : CANCEL_REASON_FALLBACK}
          role="alert"
          title="Actividad cancelada"
        />
      ) : null}

      {showBanner ? (
        <Surface overflow="hidden" padding="none">
          <Image
            alt={`Cartel de la actividad ${activity.name}`}
            aspectRatio="16 / 9"
            objectFit="cover"
            onError={() => setFailedBannerUrl(bannerUrl)}
            src={bannerUrl}
            w="full"
          />
        </Surface>
      ) : null}

      <Surface aria-labelledby="activity-detail-summary" as="section" padding="normal">
        <Stack gap={5}>
          <SectionHeader id="activity-detail-summary" title="Datos de la actividad" />
          <SimpleGrid as="dl" columns={{ base: 1, md: 2 }} gap={5}>
            <DetailField
              label="Fecha y horario"
              value={`${formatActivityDate(activity.date)} · ${activity.startTime} - ${activity.endTime}`}
            />
            <DetailField label="Tipo" value={activityTypeLabels[activity.type]} />
            <DetailField
              label="Programa"
              value={getProgramBadgeLabel(activity.program, { name: activity.unit.name })}
            />
            <DetailField label="Unidad organizativa" value={activity.unit.name} />
          </SimpleGrid>
        </Stack>
      </Surface>

      {description ? (
        <Surface aria-labelledby="activity-detail-description" as="section" padding="normal">
          <Stack gap={4}>
            <SectionHeader id="activity-detail-description" title="Descripción" />
            <Text color="text.default" lineHeight="1.7">
              {description}
            </Text>
          </Stack>
        </Surface>
      ) : null}

      {hasSpeakers ? (
        <Surface aria-labelledby="activity-detail-speakers" as="section" padding="normal">
          <Stack gap={4}>
            <SectionHeader
              id="activity-detail-speakers"
              title={activity.speakers.length === 1 ? "Expositor" : "Expositores"}
            />
            <Stack gap={1} role="list">
              {activity.speakers.map((speaker) => (
                <Text color="text.default" fontWeight="700" key={speaker.id} role="listitem">
                  {speaker.firstName} {speaker.lastName}
                </Text>
              ))}
            </Stack>
          </Stack>
        </Surface>
      ) : null}

      {activity.classroom ? (
        <Surface aria-labelledby="activity-detail-classroom" as="section" padding="normal">
          <Stack gap={4}>
            <SectionHeader id="activity-detail-classroom" title="Aula" />
            <Box>
              <Text color="text.default" fontWeight="700">
                {activity.classroom.name}
              </Text>
              {activity.classroom.building ? (
                <Text color="text.muted" mt={1}>
                  Edificio: {activity.classroom.building}
                </Text>
              ) : null}
            </Box>
          </Stack>
        </Surface>
      ) : null}

      <Surface aria-labelledby="activity-detail-capacity" as="section" padding="normal">
        <Stack gap={4}>
          <SectionHeader id="activity-detail-capacity" title="Capacidad" />
          {capacity !== null && availableSeats !== null ? (
            <SimpleGrid as="dl" columns={{ base: 1, md: 3 }} gap={5}>
              <DetailField label="Capacidad" value={String(capacity)} />
              <DetailField label="Inscritos" value={String(activity.enrolledCount)} />
              <DetailField label="Disponibles" value={String(availableSeats)} />
            </SimpleGrid>
          ) : (
            <Text color="text.muted">La capacidad de esta actividad no está informada.</Text>
          )}
        </Stack>
      </Surface>

      <Button alignSelf="start" asChild rounded="full" variant="outline">
        <RouterLink to="/">Volver a la agenda</RouterLink>
      </Button>
    </Stack>
  );
}

/**
 * Detalle publico de una actividad.
 *
 * La pagina monta esta vista con el identificador de la ruta y la vista consume
 * el hook publico: carga, fallo reintentable y no disponible se resuelven antes
 * del contenido. Un `404` o una actividad no publica se presenta como no
 * disponible con salida a la agenda, nunca con el mensaje crudo del backend.
 */
export function PublicActivityDetailView({ activityId }: PublicActivityDetailViewProps) {
  const detail = usePublicActivityDetail(activityId);
  const loadError = detail.error
    ? new Error("No fue posible cargar la actividad. Intente de nuevo.")
    : null;

  return (
    <AsyncStateView
      error={loadError}
      isLoading={detail.isLoading}
      onRetry={() => void detail.refetch()}
    >
      {detail.activity ? (
        <ActivityDetail activity={detail.activity} />
      ) : (
        <FeedbackState
          action={
            <Button asChild colorPalette="terracotta" rounded="full">
              <RouterLink to="/">Volver a la agenda</RouterLink>
            </Button>
          }
          description="La actividad que busca no está publicada o ya no está disponible. Consulte la agenda para encontrar otras actividades."
          title="Actividad no disponible"
        />
      )}
    </AsyncStateView>
  );
}
