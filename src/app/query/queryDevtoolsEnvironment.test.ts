import { describe, expect, it } from "vitest";

import { resolveQueryDevtools } from "./queryDevtoolsEnvironment";

describe("resolveQueryDevtools", () => {
  it("enables the panel only on demand in development", () => {
    expect(resolveQueryDevtools({ DEV: true, VITE_QUERY_DEVTOOLS: "on" })).toBe(true);
    expect(resolveQueryDevtools({ DEV: true, VITE_QUERY_DEVTOOLS: " ON " })).toBe(true);
    expect(resolveQueryDevtools({ DEV: true })).toBe(false);
    expect(resolveQueryDevtools({ DEV: false, VITE_QUERY_DEVTOOLS: "on" })).toBe(false);
  });
});
