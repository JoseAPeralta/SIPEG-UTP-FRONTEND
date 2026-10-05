import { vi } from "vitest";

type MediaQueryListStub = MediaQueryList & { onchange: null };

/**
 * Controls the `useMediaQuery` result that `PersonalAreaLayout` uses to choose between the persistent
 * side navigation and the mobile disclosure. The global stub in `setupTests.ts` reports
 * `matches: false` for every query, so a test that needs the desktop branch has to say so
 * explicitly instead of inheriting the collapsed mobile branch.
 */
export function stubDesktopViewport(isDesktop: boolean) {
  return vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: isDesktop,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      }) as MediaQueryListStub,
  );
}
