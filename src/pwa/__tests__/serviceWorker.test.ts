import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";

import { describe, expect, it, vi } from "vitest";

type WorkerEvent = {
  request?: {
    headers: Headers;
    method: string;
    mode: string;
    url: string;
  };
  respondWith: ReturnType<typeof vi.fn>;
  waitUntil: ReturnType<typeof vi.fn>;
};

type WorkerListener = (event: WorkerEvent) => void;

function createWorkerHarness() {
  const listeners = new Map<string, WorkerListener>();
  const cachePut = vi.fn().mockResolvedValue(undefined);
  const caches = {
    delete: vi.fn().mockResolvedValue(true),
    keys: vi.fn().mockResolvedValue(["sipeg-utp-v0", "sipeg-utp-v1", "shared-cache"]),
    match: vi.fn().mockResolvedValue(undefined),
    open: vi.fn().mockResolvedValue({
      addAll: vi.fn().mockResolvedValue(undefined),
      put: cachePut,
    }),
  };
  const fetcher = vi.fn();
  const self = {
    addEventListener: (eventName: string, listener: WorkerListener) => {
      listeners.set(eventName, listener);
    },
    clients: { claim: vi.fn().mockResolvedValue(undefined) },
    location: { origin: "https://sipeg.test" },
    skipWaiting: vi.fn().mockResolvedValue(undefined),
  };
  const source = readFileSync(resolve(process.cwd(), "public/sw.js"), "utf8");

  runInNewContext(source, {
    Headers,
    Promise,
    URL,
    caches,
    fetch: fetcher,
    self,
  });

  return { cachePut, caches, fetcher, listeners };
}

function createFetchEvent(path: string, headers = new Headers()) {
  return {
    request: {
      headers,
      method: "GET",
      mode: "cors",
      url: `https://sipeg.test${path}`,
    },
    respondWith: vi.fn(),
    waitUntil: vi.fn(),
  };
}

describe("service worker cache policy", () => {
  it.each(["/api/events", "/api"])("should not intercept API request %s", (path) => {
    const { listeners } = createWorkerHarness();
    const event = createFetchEvent(path);

    listeners.get("fetch")?.(event);

    expect(event.respondWith).not.toHaveBeenCalled();
  });

  it("should not intercept authenticated requests", () => {
    const { listeners } = createWorkerHarness();
    const event = createFetchEvent(
      "/assets/private.json",
      new Headers({ Authorization: "Bearer token" }),
    );

    listeners.get("fetch")?.(event);

    expect(event.respondWith).not.toHaveBeenCalled();
  });

  it("should preserve caches that do not belong to SIPEG", async () => {
    const { caches, listeners } = createWorkerHarness();
    const event = {
      respondWith: vi.fn(),
      waitUntil: vi.fn(),
    };

    listeners.get("activate")?.(event);
    await event.waitUntil.mock.calls[0]?.[0];

    expect(caches.delete).toHaveBeenCalledWith("sipeg-utp-v0");
    expect(caches.delete).toHaveBeenCalledWith("sipeg-utp-v1");
    expect(caches.delete).not.toHaveBeenCalledWith("shared-cache");
  });

  it.each(["private, max-age=60", "no-store"])(
    "should not cache responses marked %s",
    async (cacheControl) => {
      const { cachePut, fetcher, listeners } = createWorkerHarness();
      const response = new Response("asset", {
        headers: { "Cache-Control": cacheControl },
        status: 200,
      });
      Object.defineProperty(response, "type", { value: "basic" });
      fetcher.mockResolvedValue(response);
      const event = createFetchEvent("/assets/example.js");

      listeners.get("fetch")?.(event);
      await event.respondWith.mock.calls[0]?.[0];

      expect(cachePut).not.toHaveBeenCalled();
    },
  );
});
