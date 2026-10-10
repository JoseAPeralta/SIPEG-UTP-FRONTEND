import type { ActivityCatalogAdapter, EventProgramsAdapter } from "@/app/adapters/contracts";
import {
  apiRequest,
  type ApiClientOptions,
  type ApiRequestAuth,
} from "@/app/adapters/http/apiClient";
import type { ActivitySummary } from "@/types/domain";

import { readCatalogActivitiesPage } from "./activityCatalogMapper";

const PAGE_LIMIT = 50;

export type ApiActivityCatalogAdapterOptions = Pick<ApiClientOptions, "environment" | "fetcher">;

type AccessTokenReader = () => string | null | undefined;
type AuthReader = () => ApiRequestAuth;

/**
 * El catalogo compuesto siempre es administrativo. Cada operacion lee el token en el momento de la
 * peticion: si la sesion rota entre paginas, las siguientes usan el Bearer vigente y ninguna sale
 * sin `Authorization`.
 */
function readBearerAuth(readAccessToken: AccessTokenReader): ApiRequestAuth {
  return { accessToken: readAccessToken(), mode: "bearer" };
}

/**
 * Recorre las paginas del listado de actividades de un programa y las proyecta al resumen del
 * contrato. Nunca solicita `GET /api/v1/activities/{id}` por cada fila: el detalle se consulta al
 * abrir una actividad.
 */
async function loadActivitySummaries(
  path: string,
  options: ApiActivityCatalogAdapterOptions,
  readAuth: AuthReader,
  extraParams?: Readonly<Record<string, string>>,
): Promise<ActivitySummary[]> {
  const extraQuery = extraParams ? `&${new URLSearchParams(extraParams).toString()}` : "";
  const activities: ActivitySummary[] = [];
  let page = 1;
  let totalPages: number;

  do {
    const payload = await apiRequest<unknown>(
      `${path}?page=${page}&limit=${PAGE_LIMIT}${extraQuery}`,
      {
        ...options,
        auth: readAuth(),
      },
    );
    const parsedPage = readCatalogActivitiesPage(payload, path);

    activities.push(...parsedPage.items);
    totalPages = parsedPage.totalPages;
    page += 1;
  } while (page <= totalPages);

  return activities;
}

export function createApiActivityCatalogAdapter(
  programs: EventProgramsAdapter,
  options: ApiActivityCatalogAdapterOptions = {},
  readAccessToken: AccessTokenReader = () => null,
): ActivityCatalogAdapter {
  return {
    async loadCatalog(mode = "active-programs") {
      const allPrograms = mode === "all-programs";
      const eventPrograms = allPrograms
        ? await programs.loadEventPrograms("administrative", "ALL")
        : await programs.loadEventPrograms("administrative");
      const readAuth: AuthReader = () => readBearerAuth(readAccessToken);
      const activityPages = await Promise.all(
        eventPrograms.map((program) =>
          loadActivitySummaries(
            `/api/v1/event-programs/${encodeURIComponent(program.id)}/activities`,
            options,
            readAuth,
            allPrograms ? { status: "ALL" } : undefined,
          ),
        ),
      );

      return { activities: activityPages.flat(), eventPrograms };
    },
  };
}
