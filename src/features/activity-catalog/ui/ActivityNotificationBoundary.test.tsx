import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import { setupUser } from "@/test/user";

import { createApiActivitiesAdapter } from "../adapters/apiActivitiesAdapter";
import { activityDetailPath } from "../model/activityRoutes";
import { ActivityDetailView } from "./ActivityDetailView";
import { ProgramActivitiesView } from "./ProgramActivitiesView";

const PROGRAM_ID = "program-fisc-default";
const ACTIVITY_ID = "activity-1";
const ACTIVITY_NAME = "Taller de notificaciones";
const environment = { DEV: false, PROD: true, VITE_API_BASE_URL: "https://api.test" };

function authenticateAdministrator() {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole: "ADMIN", id: "admin-1" }),
    tokens: createAuthTokens(),
  });
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  return input instanceof URL ? input.href : input.url;
}

function jsonResponse(body: string, status = 200): Response {
  return new Response(body, { headers: { "Content-Type": "application/json" }, status });
}

function envelope(data: unknown, message = "ok"): string {
  return JSON.stringify({ message, success: true, data });
}

function apiDetail(overrides: Record<string, unknown> = {}) {
  return {
    bannerUrl: null,
    cancelReason: null,
    capacity: 40,
    checkedInCount: 2,
    classroom: null,
    date: "2026-08-24",
    description: null,
    endTime: "11:00",
    enrolledCount: 10,
    equipment: ["Proyector"],
    eventProgram: {
      id: PROGRAM_ID,
      label: "FISC",
      name: "Programa de Eventos de Ingenieria de Sistemas",
    },
    id: ACTIVITY_ID,
    name: ACTIVITY_NAME,
    organizationalUnit: {
      id: "fisc",
      name: "Facultad de Ingenieria de Sistemas Computacionales",
      type: "FACULTY",
    },
    speakers: [],
    startTime: "09:00",
    status: "DRAFT",
    type: "WORKSHOP",
    ...overrides,
  };
}

type RecordedCall = { body: unknown; method: string; path: string };

function recordedCalls(fetcher: ReturnType<typeof vi.fn<typeof fetch>>): RecordedCall[] {
  return fetcher.mock.calls.map(([input, init]) => ({
    body: typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : undefined,
    method: (init?.method ?? "GET").toUpperCase(),
    path: new URL(requestUrl(input)).pathname,
  }));
}

function commandsOf(calls: RecordedCall[]): RecordedCall[] {
  return calls.filter((call) => call.method !== "GET");
}

function apiActivitiesAdapters(fetcher: ReturnType<typeof vi.fn<typeof fetch>>): AppAdapters {
  const adapters = createAppAdapters({ source: "mock" });
  adapters.activities = createApiActivitiesAdapter({ environment, fetcher }, () => "token");

  return adapters;
}

afterEach(() => {
  useSessionStore.getState().clearSession();
});

describe("ActivityNotificationBoundary", () => {
  it("edits with the diff and announces the save without echoing the envelope message", async () => {
    authenticateAdministrator();
    const user = setupUser();
    const fetcher = vi.fn<typeof fetch>().mockImplementation((_input, init) => {
      const method = (init?.method ?? "GET").toUpperCase();
      const body = (init?.body ? JSON.parse(init.body as string) : {}) as Record<string, unknown>;

      if (method === "PATCH") {
        return Promise.resolve(
          jsonResponse(
            envelope(apiDetail({ name: body["name"] }), "Se enviaron correos a los asistentes"),
          ),
        );
      }

      return Promise.resolve(jsonResponse(envelope(apiDetail())));
    });

    renderWithProviders(<ActivityDetailView activityId={ACTIVITY_ID} mode="administration" />, {
      adapters: apiActivitiesAdapters(fetcher),
    });

    await user.click(await screen.findByRole("button", { name: "Editar actividad" }));
    const form = within(screen.getByRole("form", { name: "Editar actividad" }));
    const name = form.getByRole("textbox", { name: "Nombre" });
    await user.clear(name);
    await user.type(name, "Taller editado");
    await user.click(form.getByRole("button", { name: "Guardar cambios" }));

    expect(
      await screen.findByText(/los cambios de «taller editado» se guardaron/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/se enviaron correos/i)).not.toBeInTheDocument();

    const commands = commandsOf(recordedCalls(fetcher));
    expect(commands).toHaveLength(1);
    expect(commands[0]).toEqual({
      body: { name: "Taller editado" },
      method: "PATCH",
      path: `/api/v1/activities/${ACTIVITY_ID}`,
    });
  });

  it("walks publication, unpublication and cancellation with exclusive bodies", async () => {
    authenticateAdministrator();
    const user = setupUser();
    let current: Record<string, unknown> = apiDetail();
    const fetcher = vi.fn<typeof fetch>().mockImplementation((_input, init) => {
      const method = (init?.method ?? "GET").toUpperCase();
      const body = (init?.body ? JSON.parse(init.body as string) : {}) as Record<string, unknown>;

      if (method === "PATCH") {
        current = { ...current, ...body };
      }
      if (method === "POST") {
        current = { ...current, cancelReason: body["reason"] ?? null, status: "CANCELLED" };
      }

      return Promise.resolve(jsonResponse(envelope(current)));
    });

    renderWithProviders(<ActivityDetailView activityId={ACTIVITY_ID} mode="administration" />, {
      adapters: apiActivitiesAdapters(fetcher),
    });

    await user.click(await screen.findByRole("button", { name: "Publicar actividad" }));
    await user.click(screen.getByRole("button", { name: "Confirmar publicación" }));
    expect(await screen.findByText(/se publicó/i)).toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: "Despublicar actividad" }));
    await user.click(screen.getByRole("button", { name: "Confirmar despublicación" }));
    expect(await screen.findByText(/volvió a borrador/i)).toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: "Cancelar actividad" }));
    const form = screen.getByRole("form", { name: `Cancelar actividad "${ACTIVITY_NAME}"` });
    await user.type(
      within(form).getByRole("textbox", { name: "Motivo de cancelación — opcional" }),
      "Cierre del campus",
    );
    await user.click(within(form).getByRole("button", { name: "Confirmar cancelación" }));
    expect(await screen.findByText(/se canceló/i)).toBeInTheDocument();

    expect(commandsOf(recordedCalls(fetcher))).toEqual([
      {
        body: { status: "SCHEDULED" },
        method: "PATCH",
        path: `/api/v1/activities/${ACTIVITY_ID}`,
      },
      { body: { status: "DRAFT" }, method: "PATCH", path: `/api/v1/activities/${ACTIVITY_ID}` },
      {
        body: { reason: "Cierre del campus" },
        method: "POST",
        path: `/api/v1/activities/${ACTIVITY_ID}/cancel`,
      },
    ]);
  });

  it("deletes without a body, accepts the 204 and announces the removal", async () => {
    authenticateAdministrator();
    const user = setupUser();
    const fetcher = vi.fn<typeof fetch>().mockImplementation((input, init) => {
      const method = (init?.method ?? "GET").toUpperCase();
      const path = new URL(requestUrl(input)).pathname;

      if (method === "DELETE") {
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      if (path.includes("/event-programs/") && path.endsWith("/activities")) {
        return Promise.resolve(
          jsonResponse(envelope({ items: [], limit: 20, page: 1, total: 0, totalPages: 1 })),
        );
      }

      return Promise.resolve(jsonResponse(envelope(apiDetail())));
    });

    renderWithProviders(
      <Routes>
        <Route
          path="/admin/actividades/:activityId"
          element={<ActivityDetailView activityId={ACTIVITY_ID} mode="administration" />}
        />
        <Route
          path="/admin/programas/:programId/actividades"
          element={<ProgramActivitiesView mode="administration" programId={PROGRAM_ID} />}
        />
      </Routes>,
      {
        adapters: apiActivitiesAdapters(fetcher),
        route: activityDetailPath("administration", ACTIVITY_ID),
      },
    );

    await user.click(await screen.findByRole("button", { name: "Eliminar borrador" }));
    const form = await screen.findByRole("form", {
      name: `Eliminar borrador "${ACTIVITY_NAME}"`,
    });
    await user.click(within(form).getByRole("button", { name: "Eliminar borrador" }));

    expect(
      await screen.findByText(`El borrador de «${ACTIVITY_NAME}» se eliminó.`),
    ).toBeInTheDocument();

    const deleteCalls = recordedCalls(fetcher).filter((call) => call.method === "DELETE");
    expect(deleteCalls).toEqual([
      { body: undefined, method: "DELETE", path: `/api/v1/activities/${ACTIVITY_ID}` },
    ]);
  });

  it("keeps the form on a 409 and refreshes by reading without repeating the mutation", async () => {
    authenticateAdministrator();
    const user = setupUser();
    let patchCount = 0;
    const fetcher = vi.fn<typeof fetch>().mockImplementation((_input, init) => {
      const method = (init?.method ?? "GET").toUpperCase();

      if (method === "PATCH") {
        patchCount += 1;
        return Promise.resolve(
          jsonResponse(JSON.stringify({ message: "conflicto interno", success: false }), 409),
        );
      }

      return Promise.resolve(jsonResponse(envelope(apiDetail())));
    });

    renderWithProviders(<ActivityDetailView activityId={ACTIVITY_ID} mode="administration" />, {
      adapters: apiActivitiesAdapters(fetcher),
    });

    await user.click(await screen.findByRole("button", { name: "Editar actividad" }));
    const form = within(screen.getByRole("form", { name: "Editar actividad" }));
    const name = form.getByRole("textbox", { name: "Nombre" });
    await user.clear(name);
    await user.type(name, "Nombre conservado");
    await user.click(form.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/aula pudo ser reservada/i);
    expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveValue("Nombre conservado");

    const readsBefore = recordedCalls(fetcher).filter((call) => call.method === "GET").length;
    await user.click(screen.getByRole("button", { name: "Actualizar actividad" }));
    await waitFor(() =>
      expect(recordedCalls(fetcher).filter((call) => call.method === "GET").length).toBeGreaterThan(
        readsBefore,
      ),
    );

    expect(patchCount).toBe(1);
    expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveValue("Nombre conservado");
  });

  it("discards a lifecycle confirmation without issuing any command", async () => {
    authenticateAdministrator();
    const user = setupUser();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(() => Promise.resolve(jsonResponse(envelope(apiDetail()))));

    renderWithProviders(<ActivityDetailView activityId={ACTIVITY_ID} mode="administration" />, {
      adapters: apiActivitiesAdapters(fetcher),
    });

    await user.click(await screen.findByRole("button", { name: "Cancelar actividad" }));
    await user.click(screen.getByRole("button", { name: "Volver sin cambios" }));

    expect(commandsOf(recordedCalls(fetcher))).toHaveLength(0);
  });
});
