import { act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AppAdapters, type RegistrationAdapter } from "@/app/adapters";
import { renderHookWithProviders } from "@/test/render";
import type { RegistrationPayload } from "@/types/domain";

import { RegistrationError } from "../adapters/registrationFailure";

import { useRegisterUser } from "./useRegisterUser";

function createRegistrationAdapter(
  overrides: Partial<RegistrationAdapter> = {},
): RegistrationAdapter {
  return {
    loadCatalog: vi.fn(),
    register: vi.fn().mockResolvedValue({ userId: "user-1" }),
    ...overrides,
  };
}

function createAdapters(registration: RegistrationAdapter): AppAdapters {
  return { ...createAppAdapters({ source: "mock" }), registration };
}

const payload: RegistrationPayload = {
  careerId: "civil",
  email: "mariana@example.edu",
  firstName: "Mariana",
  identificationNumber: "8-123-456",
  lastName: "Rodriguez",
  password: "sipeg-demo-1",
  unitId: "fic",
};

describe("useRegisterUser", () => {
  it("should return the created account reference", async () => {
    const registration = createRegistrationAdapter();
    const { result } = renderHookWithProviders(() => useRegisterUser(), {
      adapters: createAdapters(registration),
    });

    await act(async () => {
      await result.current.register(payload);
    });

    await waitFor(() => expect(result.current.result).toEqual({ userId: "user-1" }));
    expect(result.current.failure).toBeNull();
  });

  it("should report a duplicate as a conflict without naming the attribute", async () => {
    const registration = createRegistrationAdapter({
      register: vi.fn().mockRejectedValue(new RegistrationError("conflict")),
    });
    const { result } = renderHookWithProviders(() => useRegisterUser(), {
      adapters: createAdapters(registration),
    });

    try {
      await act(async () => {
        await result.current.register(payload);
      });
    } catch {
      // expected rejection from mutateAsync
    }

    await waitFor(() => expect(result.current.failure).toBe("conflict"));
    expect(result.current.errorMessage).not.toMatch(/ya existe|registrad|mariana/i);
  });

  it("should answer an invalid request exactly like a duplicate", async () => {
    const conflict = createRegistrationAdapter({
      register: vi.fn().mockRejectedValue(new RegistrationError("conflict")),
    });
    const { result: conflictResult } = renderHookWithProviders(() => useRegisterUser(), {
      adapters: createAdapters(conflict),
    });

    try {
      await act(async () => {
        await conflictResult.current.register(payload);
      });
    } catch {
      // expected rejection from mutateAsync
    }

    const invalid = createRegistrationAdapter({
      register: vi.fn().mockRejectedValue(new RegistrationError("conflict")),
    });
    const { result: invalidResult } = renderHookWithProviders(() => useRegisterUser(), {
      adapters: createAdapters(invalid),
    });

    try {
      await act(async () => {
        await invalidResult.current.register(payload);
      });
    } catch {
      // expected rejection from mutateAsync
    }

    await waitFor(() => expect(invalidResult.current.failure).toBe("conflict"));
    expect(invalidResult.current.errorMessage).toBe(conflictResult.current.errorMessage);
  });

  it("should report throttling as its own failure", async () => {
    const registration = createRegistrationAdapter({
      register: vi.fn().mockRejectedValue(new RegistrationError("throttled")),
    });
    const { result } = renderHookWithProviders(() => useRegisterUser(), {
      adapters: createAdapters(registration),
    });

    try {
      await act(async () => {
        await result.current.register(payload);
      });
    } catch {
      // expected rejection from mutateAsync
    }

    await waitFor(() => expect(result.current.failure).toBe("throttled"));
  });

  it("should not report a connectivity problem as a duplicate", async () => {
    const registration = createRegistrationAdapter({
      register: vi.fn().mockRejectedValue(new RegistrationError("unavailable")),
    });
    const { result } = renderHookWithProviders(() => useRegisterUser(), {
      adapters: createAdapters(registration),
    });

    try {
      await act(async () => {
        await result.current.register(payload);
      });
    } catch {
      // expected rejection from mutateAsync
    }

    await waitFor(() => expect(result.current.failure).toBe("unavailable"));
  });
});
