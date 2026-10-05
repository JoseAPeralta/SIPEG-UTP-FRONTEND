import { act } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { renderHookWithProviders } from "@/test/render";
import { hasEffectivePermission } from "../model/operationalCapabilities";
import { useAuthorizationTime } from "./useAuthorizationTime";

afterEach(() => vi.useRealTimers());
it("disables an expiring permission without waiting for another network response", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-04T12:00:00Z"));
  const permissions = [
    {
      name: "activity:read",
      origin: "LOCAL" as const,
      validFrom: null,
      validUntil: "2026-10-04T12:00:01Z",
    },
  ];
  const { result } = renderHookWithProviders(() =>
    hasEffectivePermission(permissions, "activity:read", useAuthorizationTime(permissions)),
  );
  expect(result.current).toBe(true);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1002);
  });
  expect(result.current).toBe(false);
});
