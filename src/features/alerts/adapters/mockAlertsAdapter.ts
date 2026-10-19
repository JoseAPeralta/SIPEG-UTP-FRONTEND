import type { AlertsAdapter } from "@/app/adapters/contracts";
import { ApiError } from "@/app/adapters/http/apiClient";
import { alerts } from "@/data/mock/alerts";

import type { Alert, AlertFilters } from "../model/alert";

const PAGE_SIZE = 20;
const DEMO_OWNER_ID = "user-1";

function notFound(): ApiError {
  return new ApiError("No se encontro el recurso solicitado.", 404);
}

function matchesFilters(alert: Alert, filters: AlertFilters): boolean {
  if (filters.isRead !== undefined && alert.isRead !== filters.isRead) return false;
  if (filters.type && alert.type !== filters.type) return false;
  return true;
}

/**
 * Bandeja de demostracion. El contrato nunca permite leer ni modificar alertas ajenas, asi que el
 * mock reproduce esa frontera: otra identidad recibe una lista vacia, un `404` al marcar una alerta
 * del demo y un `read-all` sin efecto. Cada instancia muta su propia copia, de modo que el fixture
 * compartido jamas cambia.
 */
export function createMockAlertsAdapter(
  readUserId: () => string | undefined = () => DEMO_OWNER_ID,
): AlertsAdapter {
  let inbox = structuredClone(alerts);

  return {
    loadAlertsPage(filters: AlertFilters, page: number) {
      const owned = readUserId() === DEMO_OWNER_ID ? inbox : [];
      const filtered = owned
        .filter((alert) => matchesFilters(alert, filters))
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
      const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
      const start = (Math.max(1, page) - 1) * PAGE_SIZE;

      return Promise.resolve({
        items: structuredClone(filtered.slice(start, start + PAGE_SIZE)),
        limit: PAGE_SIZE,
        page,
        total: filtered.length,
        totalPages,
      });
    },
    markAlertRead(id: string) {
      if (readUserId() !== DEMO_OWNER_ID) return Promise.reject(notFound());

      const alert = inbox.find((candidate) => candidate.id === id);
      if (!alert) return Promise.reject(notFound());

      alert.isRead = true;

      return Promise.resolve(structuredClone(alert));
    },
    markAllAlertsRead() {
      if (readUserId() !== DEMO_OWNER_ID) return Promise.resolve({ updatedCount: 0 });

      const updatedCount = inbox.filter((alert) => !alert.isRead).length;
      inbox = inbox.map((alert) => ({ ...alert, isRead: true }));

      return Promise.resolve({ updatedCount });
    },
  };
}
