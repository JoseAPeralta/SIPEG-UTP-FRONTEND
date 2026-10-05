import type { ActivityCatalogAccess, ActivityCatalogAdapter } from "@/app/adapters/contracts";
import {
  apiRequest,
  type ApiClientOptions,
  type ApiRequestAuth,
} from "@/app/adapters/http/apiClient";
import {
  mapActivity,
  mapActivityId,
  mapEventProgram,
  readEnvelopeData,
  readPaginatedPage,
} from "./activityCatalogMapper";

const PAGE_LIMIT = 50;

export type ApiActivityCatalogAdapterOptions = Pick<ApiClientOptions, "environment" | "fetcher">;

type AccessTokenReader = () => string | null | undefined;

async function loadAllItems(
  path: string,
  options: ApiActivityCatalogAdapterOptions,
  auth: ApiRequestAuth,
): Promise<unknown[]> {
  const items: unknown[] = [];
  let page = 1;
  let totalPages: number;

  do {
    const payload = await apiRequest<unknown>(`${path}?page=${page}&limit=${PAGE_LIMIT}`, {
      ...options,
      auth,
    });
    const parsedPage = readPaginatedPage(payload, path);

    items.push(...parsedPage.items);
    totalPages = parsedPage.totalPages;
    page += 1;
  } while (page <= totalPages);

  return items;
}

async function loadActivity(
  activityId: string,
  options: ApiActivityCatalogAdapterOptions,
  auth: ApiRequestAuth,
) {
  const context = `activities/${activityId}`;
  const payload = await apiRequest<unknown>(
    `/api/v1/activities/${encodeURIComponent(activityId)}`,
    { ...options, auth },
  );

  return mapActivity(readEnvelopeData(payload, context), context);
}

export function createApiActivityCatalogAdapter(
  options: ApiActivityCatalogAdapterOptions = {},
  readAccessToken: AccessTokenReader = () => null,
): ActivityCatalogAdapter {
  return {
    async loadCatalog(access: ActivityCatalogAccess) {
      const auth: ApiRequestAuth =
        access === "administrative"
          ? { accessToken: readAccessToken(), mode: "bearer" }
          : { mode: "none" };
      const programPayloads = await loadAllItems("/api/v1/event-programs", options, auth);

      const eventPrograms = programPayloads.map((program, index) =>
        mapEventProgram(program, `eventPrograms[${index}]`),
      );

      // El detalle por actividad es necesario porque solo ActivityDetail
      // (GET /api/v1/activities/{id}) expone equipment, enrolledCount, checkedInCount y
      // cancelReason; ActivityListItem y EventProgramActivityItem los omiten.
      const activityIdLists = await Promise.all(
        eventPrograms.map(async (program) => {
          const items = await loadAllItems(
            `/api/v1/event-programs/${encodeURIComponent(program.id)}/activities`,
            options,
            auth,
          );

          return items.map((item, index) =>
            mapActivityId(item, `eventPrograms[${program.id}].activities[${index}]`),
          );
        }),
      );

      const activities = await Promise.all(
        activityIdLists.flat().map((activityId) => loadActivity(activityId, options, auth)),
      );

      return { activities, eventPrograms };
    },
  };
}
