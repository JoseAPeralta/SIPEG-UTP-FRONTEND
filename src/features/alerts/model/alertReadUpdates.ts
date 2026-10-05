import type { AlertFilters, AlertsPage } from "./alert";

/**
 * Intencion de lectura que se aplica sobre cada pagina cacheada.
 *
 * `wasUnread` viaja en la intencion individual porque el total de una pagina sin leer puede estar
 * en otra pagina: sin ese dato, decrementarlo seria adivinar.
 */
export type AlertReadIntent =
  { alertId: string; kind: "one"; wasUnread: boolean } | { kind: "all" };

/**
 * Actualiza una pagina cacheada segun sus filtros. Devuelve la misma referencia cuando la intencion
 * no cambia nada, para no invalidar renders ni perder la identidad del dato.
 */
export function applyAlertRead(
  page: AlertsPage,
  filters: AlertFilters,
  intent: AlertReadIntent,
): AlertsPage {
  if (intent.kind === "all") {
    if (filters.isRead === true) return page;
    if (filters.isRead === false) {
      if (page.items.length === 0 && page.total === 0) return page;
      return { ...page, items: [], total: 0, totalPages: 1 };
    }
    if (page.items.every((alert) => alert.isRead)) return page;
    return { ...page, items: page.items.map((alert) => ({ ...alert, isRead: true })) };
  }

  if (filters.isRead === true) return page;

  if (filters.isRead === false) {
    // Solo una alerta que estaba sin leer altera una pagina sin leer. Si ya estaba leida, el
    // snapshot es inconsistente y la revalidacion posterior lo corrige sin inventar un decremento.
    if (!intent.wasUnread) return page;

    const present = page.items.some((alert) => alert.id === intent.alertId);
    const total = Math.max(0, page.total - 1);

    if (!present && total === page.total) return page;

    return {
      ...page,
      items: page.items.filter((alert) => alert.id !== intent.alertId),
      total,
      totalPages: Math.max(1, Math.ceil(total / page.limit)),
    };
  }

  const hasUnreadMatch = page.items.some((alert) => alert.id === intent.alertId && !alert.isRead);

  if (!hasUnreadMatch) return page;

  return {
    ...page,
    items: page.items.map((alert) =>
      alert.id === intent.alertId ? { ...alert, isRead: true } : alert,
    ),
  };
}
