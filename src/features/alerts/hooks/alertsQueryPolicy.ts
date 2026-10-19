/**
 * Politica de refresco de la bandeja privada de alertas.
 *
 * El contrato no ofrece empuje: la unica forma de descubrir cambios es volver a consultar. Por eso
 * el refresco es por eventos (montaje con datos obsoletos, foco, reconexion y las invalidaciones de
 * `useAlertReadMutations`) y no hay sondeo periodico, que agregaria carga sin mejorar la deteccion.
 * La vigencia vive aqui, y no en los defaults globales, para que un cambio futuro del cliente de
 * consultas no altere en silencio lo que la bandeja y el indicador prometen.
 */
const ALERTS_STALE_TIME_MS = 30_000;

export const alertsQueryPolicy = {
  refetchInterval: false,
  refetchIntervalInBackground: false,
  refetchOnMount: true,
  refetchOnReconnect: true,
  refetchOnWindowFocus: true,
  staleTime: ALERTS_STALE_TIME_MS,
} as const;
