import { describe, expect, it, vi } from "vitest";

import { getEvents } from "@/services/eventsService";

describe("eventsService", () => {
  it("should fetch the event catalog from the events endpoint", async () => {
    const eventCatalog = { largeEvents: [], smallEvents: [] };
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(eventCatalog), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );

    await expect(
      getEvents({
        environment: { DEV: true, PROD: false, VITE_API_BASE_URL: "http://localhost:3000/api" },
        fetcher,
      }),
    ).resolves.toEqual(eventCatalog);

    expect(fetcher.mock.calls[0]?.[0]).toBe("http://localhost:3000/api/events");
    expect(
      new Headers((fetcher.mock.calls[0]?.[1] as RequestInit | undefined)?.headers).get("Accept"),
    ).toBe("application/json");
  });
});
