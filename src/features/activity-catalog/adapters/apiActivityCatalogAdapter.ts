import type { ActivityCatalogAdapter } from "@/app/adapters/contracts";
import { apiRequest, type ApiClientOptions } from "@/app/adapters/http/apiClient";
import type { ActivityCatalog } from "@/types/domain";

import { assertCatalogIntegrity } from "../model/catalogIntegrity";

import {
  mapActivity,
  mapActivityId,
  mapClassroom,
  mapEventProgram,
  mapOrganizationalUnit,
  readEnvelopeData,
  readPaginatedPage,
} from "./activityCatalogMapper";

const PAGE_LIMIT = 50;

export type ApiActivityCatalogAdapterOptions = Pick<
  ApiClientOptions,
  "environment" | "fetcher" | "getAccessToken"
>;

async function loadAllItems(
  path: string,
  options: ApiActivityCatalogAdapterOptions,
): Promise<unknown[]> {
  const items: unknown[] = [];
  let page = 1;
  let totalPages: number;

  do {
    const payload = await apiRequest<unknown>(`${path}?page=${page}&limit=${PAGE_LIMIT}`, options);
    const parsedPage = readPaginatedPage(payload, path);

    items.push(...parsedPage.items);
    totalPages = parsedPage.totalPages;
    page += 1;
  } while (page <= totalPages);

  return items;
}

async function loadActivity(activityId: string, options: ApiActivityCatalogAdapterOptions) {
  const context = `activities/${activityId}`;
  const payload = await apiRequest<unknown>(
    `/api/v1/activities/${encodeURIComponent(activityId)}`,
    options,
  );

  return mapActivity(readEnvelopeData(payload, context), context);
}

export function createApiActivityCatalogAdapter(
  options: ApiActivityCatalogAdapterOptions = {},
): ActivityCatalogAdapter {
  return {
    async loadCatalog() {
      const [unitPayloads, programPayloads, classroomPayloads] = await Promise.all([
        loadAllItems("/api/v1/organizational-units", options),
        loadAllItems("/api/v1/event-programs", options),
        loadAllItems("/api/v1/classrooms", options),
      ]);

      const organizationalUnits = unitPayloads.map((unit, index) =>
        mapOrganizationalUnit(unit, `organizationalUnits[${index}]`),
      );
      const eventPrograms = programPayloads.map((program, index) =>
        mapEventProgram(program, `eventPrograms[${index}]`),
      );
      const classrooms = classroomPayloads.map((classroom, index) =>
        mapClassroom(classroom, `classrooms[${index}]`),
      );

      // El detalle por actividad es necesario porque solo ActivityDetail
      // (GET /api/v1/activities/{id}) expone equipment, enrolledCount, checkedInCount y
      // cancelReason; ActivityListItem y EventProgramActivityItem los omiten.
      const activityIdLists = await Promise.all(
        eventPrograms.map(async (program) => {
          const items = await loadAllItems(
            `/api/v1/event-programs/${encodeURIComponent(program.id)}/activities`,
            options,
          );

          return items.map((item, index) =>
            mapActivityId(item, `eventPrograms[${program.id}].activities[${index}]`),
          );
        }),
      );

      const activities = await Promise.all(
        activityIdLists.flat().map((activityId) => loadActivity(activityId, options)),
      );

      const catalog: ActivityCatalog = {
        activities,
        classrooms,
        eventPrograms,
        organizationalUnits,
      };

      assertCatalogIntegrity(catalog);

      return catalog;
    },
  };
}
