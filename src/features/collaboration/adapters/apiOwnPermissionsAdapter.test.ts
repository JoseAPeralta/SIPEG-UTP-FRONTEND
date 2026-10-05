// @vitest-environment node
import { expect, it, vi } from "vitest";
import { createApiOwnPermissionsAdapter } from "./apiOwnPermissionsAdapter";

it("loads only the requested scope and reads the current bearer", async () => {
  const scope = { type: "activity" as const, id: "a /1" };
  const fetcher = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    void input;
    void init;
    return Promise.resolve(
      new Response(
        JSON.stringify({ success: true, message: "ok", data: { scope, permissions: [] } }),
        { headers: { "Content-Type": "application/json" } },
      ),
    );
  });
  let token = "old";
  const adapter = createApiOwnPermissionsAdapter(
    { environment: { DEV: false, PROD: true, VITE_API_BASE_URL: "https://api.test" }, fetcher },
    () => token,
  );
  token = "new";
  expect(await adapter.loadOwnPermissions(scope)).toEqual({ scope, permissions: [] });
  const [input, init] = fetcher.mock.calls[0]!;
  const url = new URL(
    typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
  );
  expect(url.searchParams.get("scope")).toBe("activity");
  expect(url.searchParams.get("id")).toBe(scope.id);
  expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer new");
});
