import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { createApiEventProgramsAdapter } from "@/features/event-programs";
import { useSessionStore } from "@/store/session";
import { useWorkingContextStore } from "@/store/workingContext";
import {
  createAuthenticatedUser,
  createAuthTokens,
  createClassroom,
  createOrganizationalUnit,
} from "@/test/factories";
import { renderHookWithProviders, renderWithProviders } from "@/test/render";
import { setupUser } from "@/test/user";

import { createApiActivitiesAdapter } from "../adapters/apiActivitiesAdapter";
import { createApiActivityCatalogAdapter } from "../adapters/apiActivityCatalogAdapter";
import { useAdministrativeActivityDetail } from "../hooks/useAdministrativeActivityDetail";

import { ActivityCatalogView } from "./ActivityCatalogView";

const environment = { DEV: false, PROD: true, VITE_API_BASE_URL: "https://api.test" };

const unit = createOrganizationalUnit({ id: "fic", code: "FIC" });
const classroom = createClassroom({ id: "classroom-1", name: "Aula 101" });

const programPayload = {
  bannerUrl: null,
  description: null,
  endDate: "2026-06-19",
  id: "program-1",
  isDefault: false,
  label: "Semana de innovacion",
  name: "Semana de Innovacion Academica",
  organizationalUnit: { id: "fic", name: unit.name, type: "FACULTY" },
  startDate: "2026-06-15",
  status: "ACTIVE",
};

function activityItem(index: number) {
  return {
    bannerUrl: null,
    capacity: 40,
    classroom: { building: "Edificio de Aulas", id: "classroom-1", name: "Aula 101" },
    date: "2026-06-15",
    description:
      index === 1
        ? "Detalle extenso de la actividad. ".repeat(8)
        : `Descripcion de la actividad ${index}.`,
    endTime: "11:00",
    eventProgram: { id: "program-1", label: "Semana de innovacion", name: "Semana" },
    id: `activity-${index}`,
    name: `Actividad ${index}`,
    organizationalUnit: { id: "fic", name: unit.name, type: "FACULTY" },
    speakers: [],
    startTime: "09:00",
    status: "SCHEDULED",
    type: "TALK",
  };
}

function detailPayload() {
  return {
    ...activityItem(1),
    cancelReason: null,
    checkedInCount: 3,
    enrolledCount: 20,
    equipment: ["Proyector"],
  };
}

function envelope(items: unknown[], totalPages = 1, page = 1) {
  return {
    data: { items, limit: 50, page, total: items.length, totalPages },
    message: "ok",
    success: true,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

function toUrl(input: RequestInfo | URL) {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.href;
  }

  return input.url;
}

function createFetcher(activityCount = 12) {
  return vi.fn((input: RequestInfo | URL) => {
    const url = new URL(toUrl(input));

    if (url.pathname === "/api/v1/event-programs/program-1/activities") {
      const page = Number(url.searchParams.get("page") ?? "1");
      const start = (page - 1) * 50;
      const items = Array.from(
        { length: Math.max(0, Math.min(50, activityCount - start)) },
        (_, index) => activityItem(start + index + 1),
      );

      return Promise.resolve(jsonResponse(envelope(items, 1, page)));
    }

    if (url.pathname === "/api/v1/event-programs") {
      return Promise.resolve(jsonResponse(envelope([programPayload])));
    }

    if (url.pathname === "/api/v1/activities/activity-1") {
      return Promise.resolve(jsonResponse({ data: detailPayload(), message: "ok", success: true }));
    }

    return Promise.resolve(jsonResponse({ message: "not found", success: false }, 404));
  });
}

function detailRequests(fetcher: ReturnType<typeof createFetcher>) {
  return fetcher.mock.calls.filter(([input]) =>
    /^\/api\/v1\/activities\/[^/]+$/.test(new URL(toUrl(input)).pathname),
  );
}

function buildAdapters(fetcher: ReturnType<typeof createFetcher>): AppAdapters {
  const base = createAppAdapters({ source: "mock" });
  const options = { environment, fetcher };

  return {
    ...base,
    activities: createApiActivitiesAdapter(options, () => "access-token"),
    activityCatalog: createApiActivityCatalogAdapter(
      createApiEventProgramsAdapter(options, () => "access-token"),
      options,
      () => "access-token",
    ),
    classrooms: {
      ...base.classrooms,
      loadClassrooms: vi.fn().mockResolvedValue([classroom]),
    },
    organizationalUnits: {
      ...base.organizationalUnits,
      loadOrganizationalUnits: vi.fn().mockResolvedValue([unit]),
    },
  };
}

describe("ActivityCatalogLoading integration", () => {
  beforeEach(() => {
    useWorkingContextStore.getState().clearWorkingContext();
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens(),
    });
  });

  afterEach(() => {
    useWorkingContextStore.getState().clearWorkingContext();
    useSessionStore.getState().clearSession();
  });

  it("covers the catalog interactions without a single detail request", async () => {
    const user = setupUser();
    const fetcher = createFetcher(12);
    const adapters = buildAdapters(fetcher);

    renderWithProviders(<ActivityCatalogView />, { adapters });

    expect(await screen.findByText("Actividad 1")).toBeInTheDocument();
    expect(detailRequests(fetcher)).toHaveLength(0);

    await user.type(screen.getByRole("textbox", { name: /buscar actividades/i }), "Actividad 12");
    expect(await screen.findByText("Actividad 12")).toBeInTheDocument();
    expect(screen.queryByText("Actividad 1")).not.toBeInTheDocument();

    await user.clear(screen.getByRole("textbox", { name: /buscar actividades/i }));
    expect(await screen.findByText("Actividad 1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(await screen.findByText("Actividad 12")).toBeInTheDocument();
    expect(detailRequests(fetcher)).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "1" }));
    expect(await screen.findByText("Actividad 1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /leer mas/i }));
    expect(screen.getByRole("button", { name: /leer menos/i })).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /usar semana de innovacion academica en panel/i }),
    );

    expect(await screen.findByText(/contexto activo: semana de innovacion/i)).toBeInTheDocument();
    expect(detailRequests(fetcher)).toHaveLength(0);

    expect(screen.getByRole("link", { name: /ver detalle de actividad 1/i })).toHaveAttribute(
      "href",
      "/admin/actividades/activity-1",
    );
  });

  it("requests exactly one detail when the administrative detail opens", async () => {
    const fetcher = createFetcher(12);
    const adapters = buildAdapters(fetcher);
    const { result } = renderHookWithProviders(
      () => useAdministrativeActivityDetail("activity-1"),
      { adapters },
    );

    await waitFor(() => expect(result.current.activity).not.toBeNull());

    expect(detailRequests(fetcher)).toHaveLength(1);
    expect(result.current.activity?.enrolledCount).toBe(20);
    expect(result.current.activity?.equipment).toEqual(["Proyector"]);
  });
});
