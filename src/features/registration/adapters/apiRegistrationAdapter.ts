import type { RegistrationAdapter } from "@/app/adapters/contracts";
import { apiRequest, type ApiClientOptions } from "@/app/adapters/http/apiClient";
import type { RegistrationPayload } from "@/types/domain";

import {
  mapRegistrationCareer,
  mapRegistrationResult,
  mapRegistrationUnit,
  readRegistrationEnvelopeData,
  readRegistrationPage,
} from "./registrationMapper";

const PAGE_LIMIT = 50;

export type ApiRegistrationAdapterOptions = Pick<ApiClientOptions, "environment" | "fetcher">;

async function loadAllItems(path: string, options: ApiRegistrationAdapterOptions) {
  const items: unknown[] = [];
  let page = 1;
  let totalPages: number;

  do {
    const payload = await apiRequest<unknown>(`${path}?page=${page}&limit=${PAGE_LIMIT}`, {
      ...options,
      auth: { mode: "none" },
    });
    const parsedPage = readRegistrationPage(payload, path);
    items.push(...parsedPage.items);
    totalPages = parsedPage.totalPages;
    page += 1;
  } while (page <= totalPages);

  return items;
}

function jsonRequest(payload: RegistrationPayload): RequestInit {
  return {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  };
}

export function createApiRegistrationAdapter(
  options: ApiRegistrationAdapterOptions = {},
): RegistrationAdapter {
  return {
    async loadCatalog() {
      const [unitPayloads, careerPayloads] = await Promise.all([
        loadAllItems("/api/v1/organizational-units", options),
        loadAllItems("/api/v1/careers", options),
      ]);

      return {
        careers: careerPayloads.map((career, index) =>
          mapRegistrationCareer(career, `careers[${index}]`),
        ),
        organizationalUnits: unitPayloads.map((unit, index) =>
          mapRegistrationUnit(unit, `organizationalUnits[${index}]`),
        ),
      };
    },

    async register(payload) {
      const response = await apiRequest<unknown>("/api/v1/auth/register", {
        ...options,
        auth: { mode: "none" },
        requestInit: jsonRequest(payload),
      });

      return mapRegistrationResult(
        readRegistrationEnvelopeData(response, "auth.register"),
        "auth.register.data",
      );
    },
  };
}
