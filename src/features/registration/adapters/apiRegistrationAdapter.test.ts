import { describe, expect, it, vi } from "vitest";

import { createApiRegistrationAdapter } from "./apiRegistrationAdapter";

const environment = {
  DEV: false,
  PROD: true,
  VITE_API_BASE_URL: "https://api.test",
} as const;

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data, message: "ok", success: true }), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

describe("createApiRegistrationAdapter", () => {
  it("should load and map public registration catalogs", async () => {
    const fetcher = vi.fn((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

      if (url.includes("organizational-units")) {
        return Promise.resolve(
          jsonResponse({
            items: [
              {
                code: "FISC",
                description: null,
                head: null,
                id: "unit-1",
                isActive: true,
                name: "Facultad de Sistemas",
                type: "FACULTY",
              },
            ],
            totalPages: 1,
          }),
        );
      }

      return Promise.resolve(
        jsonResponse({
          items: [
            {
              code: "OTROS",
              description: null,
              id: "career-other",
              name: "Otros",
              unit: null,
            },
          ],
          totalPages: 1,
        }),
      );
    });
    const adapter = createApiRegistrationAdapter({ environment, fetcher });

    await expect(adapter.loadCatalog()).resolves.toMatchObject({
      careers: [{ id: "career-other", unitId: null }],
      organizationalUnits: [{ id: "unit-1", type: "FACULTY" }],
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("should register with the contracted public payload", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ userId: "user-1" }, 201));
    const adapter = createApiRegistrationAdapter({ environment, fetcher });
    const payload = {
      careerId: "career-1",
      email: "persona@example.edu",
      firstName: "Maria",
      identificationNumber: "8-123-456",
      lastName: "Perez",
      password: "contrasena-123",
      unitId: "unit-1",
    };

    await expect(adapter.register(payload)).resolves.toEqual({ userId: "user-1" });
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.test/api/v1/auth/register",
      expect.objectContaining({ method: "POST" }),
    );
    const request = fetcher.mock.calls[0]?.[1] as RequestInit;
    if (typeof request.body !== "string") {
      throw new Error("Expected a JSON string request body");
    }

    expect(JSON.parse(request.body)).toEqual(payload);
    expect(new Headers(request.headers).get("Authorization")).toBeNull();
  });
});
