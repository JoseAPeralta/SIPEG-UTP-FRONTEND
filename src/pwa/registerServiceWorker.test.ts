import { describe, expect, it } from "vitest";

import { shouldRegisterServiceWorker } from "@/pwa/registerServiceWorker";

describe("shouldRegisterServiceWorker", () => {
  it("should register in production when service workers are supported", () => {
    expect(
      shouldRegisterServiceWorker({
        isDevelopment: false,
        isSecureContext: true,
        serviceWorker: {} as ServiceWorkerContainer,
      }),
    ).toBe(true);
  });

  it("should not register during development", () => {
    expect(
      shouldRegisterServiceWorker({
        isDevelopment: true,
        isSecureContext: true,
        serviceWorker: {} as ServiceWorkerContainer,
      }),
    ).toBe(false);
  });

  it("should not register without service worker support", () => {
    expect(
      shouldRegisterServiceWorker({
        isDevelopment: false,
        isSecureContext: true,
      }),
    ).toBe(false);
  });
});
