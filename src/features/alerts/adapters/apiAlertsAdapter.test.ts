// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { createAlert, createAlertsPage } from "@/test/factories";

import { alertsQuery, createApiAlertsAdapter } from "./apiAlertsAdapter";

const environment = { DEV: false, PROD: true, VITE_API_BASE_URL: "https://api.test" };

function fetcherReturning(payload: unknown) {
  return vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
    void input;
    void requestInit;

    return Promise.resolve(
      new Response(JSON.stringify(payload), { headers: { "Content-Type": "application/json" } }),
    );
  });
}

function toUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.href;
  }

  return input.url;
}

describe("alertsQuery", () => {
  it("should send the contract limit and only the present filters", () => {
    expect(alertsQuery({}, 1)).toBe("/api/v1/alerts?limit=20&page=1");
    expect(alertsQuery({ isRead: false, type: "CERTIFICATE_ISSUED" }, 3)).toBe(
      "/api/v1/alerts?limit=20&page=3&isRead=false&type=CERTIFICATE_ISSUED",
    );
  });
});

describe("createApiAlertsAdapter", () => {
  it("should authenticate, map the page and never invent a recipient", async () => {
    const page = createAlertsPage({ page: 2, total: 21, totalPages: 2 });
    const fetcher = fetcherReturning({ data: page, message: "ok", success: true });
    const adapter = createApiAlertsAdapter({ environment, fetcher }, () => "session-access-token");

    await expect(adapter.loadAlertsPage({ isRead: true }, 2)).resolves.toEqual(page);

    const [input, requestInit] = fetcher.mock.calls[0] ?? [];
    const url = toUrl(input!);

    expect(url).toContain("/api/v1/alerts?limit=20&page=2&isRead=true");
    expect(url).not.toContain("userId");
    expect(url).not.toContain("recipient");
    expect(new Headers(requestInit?.headers).get("Authorization")).toBe(
      "Bearer session-access-token",
    );
  });

  it("should fail before sending when the session has no token", async () => {
    const fetcher = fetcherReturning({ data: createAlertsPage(), message: "ok", success: true });
    const adapter = createApiAlertsAdapter({ environment, fetcher }, () => null);

    await expect(adapter.loadAlertsPage({}, 1)).rejects.toMatchObject({ status: 401 });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("should PATCH one alert without a body and encode the id", async () => {
    const alert = createAlert({ id: "alert con espacio/mostrador", isRead: true });
    const fetcher = fetcherReturning({ data: alert, message: "ok", success: true });
    const adapter = createApiAlertsAdapter({ environment, fetcher }, () => "session-access-token");

    await expect(adapter.markAlertRead("alert con espacio/mostrador")).resolves.toEqual(alert);

    const [input, requestInit] = fetcher.mock.calls[0] ?? [];
    const url = toUrl(input!);

    expect(url).toContain("/api/v1/alerts/alert%20con%20espacio%2Fmostrador/read");
    expect(requestInit?.method).toBe("PATCH");
    expect(requestInit?.body).toBeUndefined();
    expect(new Headers(requestInit?.headers).get("Authorization")).toBe(
      "Bearer session-access-token",
    );
  });

  it("should POST read-all without a body and never target another user", async () => {
    const fetcher = fetcherReturning({
      data: { updatedCount: 4 },
      message: "ok",
      success: true,
    });
    const adapter = createApiAlertsAdapter({ environment, fetcher }, () => "session-access-token");

    await expect(adapter.markAllAlertsRead()).resolves.toEqual({ updatedCount: 4 });

    const [input, requestInit] = fetcher.mock.calls[0] ?? [];
    const url = toUrl(input!);

    expect(url).toContain("/api/v1/alerts/read-all");
    expect(url).not.toContain("userId");
    expect(url).not.toContain("recipient");
    expect(requestInit?.method).toBe("POST");
    expect(requestInit?.body).toBeUndefined();
  });

  it("should fail both read mutations before sending when the session has no token", async () => {
    const fetcher = fetcherReturning({ data: createAlert(), message: "ok", success: true });
    const adapter = createApiAlertsAdapter({ environment, fetcher }, () => null);

    await expect(adapter.markAlertRead("alert-1")).rejects.toMatchObject({ status: 401 });
    await expect(adapter.markAllAlertsRead()).rejects.toMatchObject({ status: 401 });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
