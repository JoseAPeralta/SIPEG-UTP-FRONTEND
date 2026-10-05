import type { RegistrationAdapter } from "@/app/adapters/contracts";
import { apiRequest, type ApiClientOptions } from "@/app/adapters/http/apiClient";
import type { RegistrationPayload } from "@/types/domain";

import { mapRegistrationResult, readRegistrationEnvelopeData } from "./registrationMapper";

export type ApiRegistrationAdapterOptions = Pick<ApiClientOptions, "environment" | "fetcher">;

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
