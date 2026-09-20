import type { LargeEvent, SmallEvent } from "@/types/domain";
import { apiRequest, type ApiClientOptions } from "@/services/apiClient";

export type EventCatalog = {
  largeEvents: LargeEvent[];
  smallEvents: SmallEvent[];
};

export type EventsServiceOptions = Pick<ApiClientOptions, "environment" | "fetcher">;

export function getEvents(options: EventsServiceOptions = {}) {
  return apiRequest<EventCatalog>("/events", options);
}
