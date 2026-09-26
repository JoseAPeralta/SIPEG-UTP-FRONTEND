import { dehydrate, useQuery, useQueryClient } from "@tanstack/react-query";
import { render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { QueryProvider } from "./QueryProvider";
import { createQueryClient } from "./queryClient";
import { queryKeys } from "./queryKeys";
import { QUERY_CACHE_STORAGE_KEY, createQueryPersister } from "./queryPersistence";

afterEach(() => {
  window.localStorage.clear();
});

describe("QueryProvider", () => {
  it("should expose the provided client to children", () => {
    const client = createQueryClient();
    let received;

    function Probe() {
      received = useQueryClient();

      return <span>ok</span>;
    }

    render(
      <QueryProvider client={client}>
        <Probe />
      </QueryProvider>,
    );

    expect(screen.getByText("ok")).toBeInTheDocument();
    expect(received).toBe(client);
  });

  it("should restore a persisted cache when persistence is enabled", async () => {
    const client = createQueryClient();
    const source = createQueryClient();

    source.setQueryData(queryKeys.activityCatalog, { restored: true });

    const persister = createQueryPersister(window.localStorage, 0);

    await persister.persistClient({
      buster: "dev",
      clientState: dehydrate(source),
      timestamp: Date.now(),
    });

    await vi.waitFor(() => {
      expect(window.localStorage.getItem(QUERY_CACHE_STORAGE_KEY)).not.toBeNull();
    });

    render(
      <QueryProvider client={client} persist>
        <span>ok</span>
      </QueryProvider>,
    );

    await waitFor(() =>
      expect(client.getQueryData(queryKeys.activityCatalog)).toEqual({ restored: true }),
    );
  });

  it("should fail loudly when a query runs without a provider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() =>
      renderHook(() =>
        useQuery({ queryKey: ["no-provider"], queryFn: () => Promise.resolve("no") }),
      ),
    ).toThrow(/No QueryClient/);

    consoleError.mockRestore();
  });
});
