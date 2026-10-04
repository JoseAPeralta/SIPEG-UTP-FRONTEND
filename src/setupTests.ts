import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

// Lazy route modules can queue behind the full parallel suite; one second is too short to
// distinguish that scheduling delay from a route that never resolves.
configure({ asyncUtilTimeout: 5_000 });

Object.defineProperty(window, "matchMedia", {
  value: vi.fn().mockImplementation((query: string) => ({
    addEventListener: vi.fn(),
    addListener: vi.fn(),
    dispatchEvent: vi.fn(),
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: vi.fn(),
    removeListener: vi.fn(),
  })),
  writable: true,
});
