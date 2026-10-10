import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { App } from "@/App";
import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import type { UserScope, UserScopePermission } from "@/features/collaboration";
import { useSessionStore } from "@/store/session";
import { useUnitPreferenceStore } from "@/store/unitPreference";
import { useWorkingContextStore } from "@/store/workingContext";
import { createAuthenticatedUser, createAuthTokens, createUserScope } from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import { stubDesktopViewport } from "@/test/viewport";

const PROGRAM_ID = "program-fisc-default";
const PROGRAM_NAME = "Programa de Eventos de Ingenieria de Sistemas";
const PRIVATE_DRAFT_NAME = "Borrador interno de titulacion";
const CANCELLED_NAME = "Charla cancelada de laboratorio";
const CANCELLED_REASON = "Cierre del campus por lluvia";

function authenticate(role: "ADMIN" | "USER") {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole: role, id: `${role.toLowerCase()}-1` }),
    tokens: createAuthTokens(),
  });
}

function permission(name: string): UserScopePermission {
  return { name, origin: "LOCAL", validFrom: null, validUntil: null };
}

async function createDraftActivity(adapters: AppAdapters, name: string) {
  return adapters.activities.createActivity({
    date: "2026-11-03",
    endTime: "11:00",
    eventProgramId: PROGRAM_ID,
    name,
    startTime: "09:00",
    type: "TALK",
  });
}

/** Crea con sesion ADMIN el borrador y la cancelada que la matriz necesita, y cierra la sesion. */
async function seedPrivateActivities(adapters: AppAdapters) {
  authenticate("ADMIN");
  const draft = await createDraftActivity(adapters, PRIVATE_DRAFT_NAME);
  const toCancel = await createDraftActivity(adapters, CANCELLED_NAME);
  const cancelled = await adapters.activities.cancelActivity(toCancel.id, {
    reason: CANCELLED_REASON,
  });
  useSessionStore.getState().clearSession();

  return { cancelled, draft };
}

/** Programa adicional no predeterminado con una actividad en borrador y luego archivado. */
async function seedArchivedProgramActivity(adapters: AppAdapters) {
  authenticate("ADMIN");
  const program = await adapters.eventPrograms.createEventProgram!({
    description: null,
    endDate: "2026-12-20",
    label: null,
    name: "Programa por archivar",
    organizationalUnitId: "fisc",
    startDate: "2026-12-01",
  });
  await adapters.eventPrograms.updateEventProgram!(program.id, { status: "ACTIVE" });
  const activity = await adapters.activities.createActivity({
    date: "2026-12-05",
    endTime: "12:00",
    eventProgramId: program.id,
    name: "Actividad de programa archivado",
    startTime: "10:00",
    type: "WORKSHOP",
  });
  await adapters.eventPrograms.archiveEventProgram!(program.id);

  return { activity, program };
}

function programScope(id: string, name: string, permissions: UserScopePermission[]): UserScope {
  return createUserScope({
    eventProgram: null,
    id,
    name,
    permissions,
    status: "ACTIVE",
    type: "program",
  });
}

beforeEach(() => {
  stubDesktopViewport(true);
  useSessionStore.getState().clearSession();
  useUnitPreferenceStore.getState().setSelectedUnitId("all");
  useWorkingContextStore.getState().clearWorkingContext();
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => useSessionStore.getState().clearSession());

describe("public agenda frontier by identity", () => {
  it.each([
    { label: "a visitor", role: null },
    { label: "a standard user", role: "USER" as const },
    { label: "an administrator", role: "ADMIN" as const },
  ])(
    "should keep drafts and cancelled activities out of the agenda for $label",
    async ({ role }) => {
      const adapters = createAppAdapters({ source: "mock" });
      await seedPrivateActivities(adapters);
      if (role) authenticate(role);

      renderWithProviders(<App />, { adapters });

      expect(
        await screen.findByRole("heading", {
          level: 1,
          name: /descubra actividades academicas/i,
        }),
      ).toBeInTheDocument();
      expect(
        await screen.findByRole("link", {
          name: /gobernanza de datos abiertos universitarios/i,
        }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: PRIVATE_DRAFT_NAME })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: CANCELLED_NAME })).not.toBeInTheDocument();
      expect(screen.queryByText(CANCELLED_REASON)).not.toBeInTheDocument();
    },
  );

  it("should not publish a draft to an anonymous direct link", async () => {
    const adapters = createAppAdapters({ source: "mock" });
    const { draft } = await seedPrivateActivities(adapters);

    renderWithProviders(<App />, { adapters, route: `/actividades/${draft.id}` });

    expect(await screen.findByText("Actividad no disponible")).toBeInTheDocument();
    expect(screen.queryByText(PRIVATE_DRAFT_NAME)).not.toBeInTheDocument();
  });

  it("should resolve a cancelled activity for an anonymous direct link with its reason", async () => {
    const adapters = createAppAdapters({ source: "mock" });
    const { cancelled } = await seedPrivateActivities(adapters);

    renderWithProviders(<App />, { adapters, route: `/actividades/${cancelled.id}` });

    expect(
      await screen.findByRole("heading", { level: 1, name: new RegExp(CANCELLED_NAME, "i") }),
    ).toBeInTheDocument();
    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent("Actividad cancelada");
    expect(alert).toHaveTextContent(CANCELLED_REASON);
    expect(screen.getByText("Cancelada")).toBeInTheDocument();
  });
});

describe("private detail by identity", () => {
  it("should open the private draft detail with its lifecycle for an administrator", async () => {
    const adapters = createAppAdapters({ source: "mock" });
    const { draft } = await seedPrivateActivities(adapters);
    authenticate("ADMIN");

    renderWithProviders(<App />, { adapters, route: `/admin/actividades/${draft.id}` });

    expect(
      await screen.findByRole("heading", { level: 1, name: PRIVATE_DRAFT_NAME }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Publicar actividad" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar borrador" })).toBeInTheDocument();
  });

  it("should open the private cancelled detail with its reason for an administrator", async () => {
    const adapters = createAppAdapters({ source: "mock" });
    const { cancelled } = await seedPrivateActivities(adapters);
    authenticate("ADMIN");

    renderWithProviders(<App />, { adapters, route: `/admin/actividades/${cancelled.id}` });

    expect(
      await screen.findByRole("heading", { level: 1, name: CANCELLED_NAME }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent(CANCELLED_REASON);
    expect(screen.queryByRole("button", { name: "Editar actividad" })).not.toBeInTheDocument();
  });

  it("should let a collaborator inherit reading from the program scope", async () => {
    const adapters = createAppAdapters({ source: "mock" });
    const { draft } = await seedPrivateActivities(adapters);
    authenticate("USER");
    adapters.userScopes = {
      loadUserScopes: () =>
        Promise.resolve([programScope(PROGRAM_ID, PROGRAM_NAME, [permission("activity:read")])]),
    };

    renderWithProviders(<App />, {
      adapters,
      route: `/operaciones/actividades/${draft.id}/detalle`,
    });

    expect(
      await screen.findByRole("heading", { level: 1, name: PRIVATE_DRAFT_NAME }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publicar actividad" })).not.toBeInTheDocument();
  });

  it("should let a collaborator read through an exact activity scope", async () => {
    const adapters = createAppAdapters({ source: "mock" });
    const { draft } = await seedPrivateActivities(adapters);
    authenticate("USER");
    adapters.userScopes = {
      loadUserScopes: () =>
        Promise.resolve([
          createUserScope({
            eventProgram: { id: PROGRAM_ID, label: null, name: PROGRAM_NAME, status: "ACTIVE" },
            id: draft.id,
            name: PRIVATE_DRAFT_NAME,
            permissions: [permission("activity:read")],
            status: "DRAFT",
            type: "activity",
          }),
        ]),
    };

    renderWithProviders(<App />, {
      adapters,
      route: `/operaciones/actividades/${draft.id}/detalle`,
    });

    expect(
      await screen.findByRole("heading", { level: 1, name: PRIVATE_DRAFT_NAME }),
    ).toBeInTheDocument();
  });

  it("should deny the detail to a scope that matches neither the activity nor its program", async () => {
    const adapters = createAppAdapters({ source: "mock" });
    const { draft } = await seedPrivateActivities(adapters);
    authenticate("USER");
    adapters.userScopes = {
      loadUserScopes: () =>
        Promise.resolve([
          programScope("program-other", "Otro programa", [permission("activity:read")]),
        ]),
    };

    renderWithProviders(<App />, {
      adapters,
      route: `/operaciones/actividades/${draft.id}/detalle`,
    });

    expect(await screen.findByText("Contexto no autorizado")).toBeInTheDocument();
    expect(screen.queryByText(PRIVATE_DRAFT_NAME)).not.toBeInTheDocument();
  });
});

describe("non-active programs", () => {
  it("should not publish an archived program activity to an anonymous direct link", async () => {
    const adapters = createAppAdapters({ source: "mock" });
    const { activity } = await seedArchivedProgramActivity(adapters);
    useSessionStore.getState().clearSession();

    renderWithProviders(<App />, { adapters, route: `/actividades/${activity.id}` });

    expect(await screen.findByText("Actividad no disponible")).toBeInTheDocument();
  });

  it("should still read an archived program activity for an authorized administrator", async () => {
    const adapters = createAppAdapters({ source: "mock" });
    const { activity } = await seedArchivedProgramActivity(adapters);

    renderWithProviders(<App />, { adapters, route: `/admin/actividades/${activity.id}` });

    expect(
      await screen.findByRole("heading", { level: 1, name: "Actividad de programa archivado" }),
    ).toBeInTheDocument();
  });
});
