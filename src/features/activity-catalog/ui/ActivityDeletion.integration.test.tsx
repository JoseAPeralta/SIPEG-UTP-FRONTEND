import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Link, Route, Routes, useLocation, useParams } from "react-router";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import { useWorkingContextStore } from "@/store/workingContext";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import { setupUser } from "@/test/user";

import { activityDetailPath } from "../model/activityRoutes";
import { ActivityDetailView } from "./ActivityDetailView";
import { ProgramActivitiesView } from "./ProgramActivitiesView";

const PROGRAM_ID = "program-fisc-default";

function authenticateAdministrator() {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole: "ADMIN", id: "admin-1" }),
    tokens: createAuthTokens(),
  });
}

function createDraft(adapters: AppAdapters) {
  return adapters.activities.createActivity({
    date: "2026-08-24",
    endTime: "09:00",
    eventProgramId: PROGRAM_ID,
    name: "Borrador eliminable integrado",
    startTime: "08:00",
    type: "WORKSHOP",
  });
}

function AdministrationActivityDetailRoute() {
  const { activityId } = useParams();

  if (!activityId) return null;

  return <ActivityDetailView activityId={activityId} mode="administration" />;
}

function AdministrationProgramActivitiesRoute({ reopenActivityId }: { reopenActivityId: string }) {
  const { programId } = useParams();
  const location = useLocation();

  if (!programId) return null;

  return (
    <>
      <span data-testid="destination-path">{location.pathname}</span>
      <ProgramActivitiesView mode="administration" programId={programId} />
      <Link to={activityDetailPath("administration", reopenActivityId)}>
        Reabrir detalle eliminado
      </Link>
    </>
  );
}

function renderDeletionJourney(adapters: AppAdapters, activityId: string) {
  return renderWithProviders(
    <Routes>
      <Route
        path="/admin/actividades/:activityId"
        element={<AdministrationActivityDetailRoute />}
      />
      <Route
        path="/admin/programas/:programId/actividades"
        element={<AdministrationProgramActivitiesRoute reopenActivityId={activityId} />}
      />
    </Routes>,
    { adapters, route: activityDetailPath("administration", activityId) },
  );
}

afterEach(() => {
  useSessionStore.getState().clearSession();
  useWorkingContextStore.getState().clearWorkingContext();
});

describe("Activity deletion integration", () => {
  it("walks a draft from working context through deletion to an unavailable resource", async () => {
    authenticateAdministrator();
    const adapters = createAppAdapters({ source: "mock" });
    const draft = await createDraft(adapters);
    useWorkingContextStore.getState().setWorkingContext({ id: draft.id, kind: "activity" });

    renderDeletionJourney(adapters, draft.id);
    const user = setupUser();

    await screen.findByRole("heading", { level: 1, name: draft.name });
    await user.click(await screen.findByRole("button", { name: "Eliminar borrador" }));
    const form = await screen.findByRole("form", { name: `Eliminar borrador "${draft.name}"` });
    await user.click(within(form).getByRole("button", { name: "Eliminar borrador" }));

    expect(
      await screen.findByText(`El borrador de «${draft.name}» se eliminó.`),
    ).toBeInTheDocument();
    expect(screen.getByTestId("destination-path")).toHaveTextContent(
      `/admin/programas/${PROGRAM_ID}/actividades`,
    );

    const destinationHeading = await screen.findByRole("heading", {
      level: 1,
      name: "Actividades",
    });
    await waitFor(() => expect(destinationHeading).toHaveFocus());

    expect(await screen.findByRole("button", { name: "Nueva actividad" })).toBeVisible();
    await waitFor(() =>
      expect(screen.queryByRole("article", { name: draft.name })).not.toBeInTheDocument(),
    );

    expect(useWorkingContextStore.getState().workingContext).toBeNull();

    const scopes = await adapters.userScopes.loadUserScopes();
    expect(scopes.map((scope) => scope.id)).not.toContain(draft.id);

    const page = await adapters.activities.loadProgramActivitiesPage(PROGRAM_ID, {}, 1);
    expect(page.items.map((item) => item.id)).not.toContain(draft.id);

    await user.click(screen.getByRole("link", { name: /reabrir detalle eliminado/i }));

    expect(await screen.findByText("No se pudo cargar la informacion")).toBeInTheDocument();
    await expect(adapters.activities.getActivity(draft.id)).rejects.toMatchObject({ status: 404 });
  });

  it("keeps the activity and its context when retention rejects the deletion", async () => {
    authenticateAdministrator();
    const adapters = createAppAdapters({ source: "mock" });
    const draft = await createDraft(adapters);
    useWorkingContextStore.getState().setWorkingContext({ id: draft.id, kind: "activity" });
    const deleteActivity = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("retencion"), { status: 409 }));
    adapters.activities = { ...adapters.activities, deleteActivity };

    renderDeletionJourney(adapters, draft.id);
    const user = setupUser();

    await screen.findByRole("heading", { level: 1, name: draft.name });
    await user.click(await screen.findByRole("button", { name: "Eliminar borrador" }));
    const form = await screen.findByRole("form", { name: `Eliminar borrador "${draft.name}"` });
    await user.click(within(form).getByRole("button", { name: "Eliminar borrador" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /registros de asistencia o alertas que deben conservarse/i,
    );
    expect(
      screen.getByRole("form", { name: `Eliminar borrador "${draft.name}"` }),
    ).toBeInTheDocument();
    expect(useWorkingContextStore.getState().workingContext).toEqual({
      id: draft.id,
      kind: "activity",
    });
    await expect(adapters.activities.getActivity(draft.id)).resolves.toMatchObject({
      id: draft.id,
    });

    await user.click(screen.getByRole("button", { name: "Actualizar actividad" }));
    await waitFor(() => expect(deleteActivity).toHaveBeenCalledTimes(1));

    const page = await adapters.activities.loadProgramActivitiesPage(PROGRAM_ID, {}, 1);
    expect(page.items.map((item) => item.id)).toContain(draft.id);
    expect(screen.queryByText(/se eliminó/i)).not.toBeInTheDocument();
  });

  it("keeps the deletion confirmation keyboard reachable and focused inside a 320 px container", async () => {
    authenticateAdministrator();
    const adapters = createAppAdapters({ source: "mock" });
    const draft = await createDraft(adapters);

    renderWithProviders(
      <div style={{ width: 320 }}>
        <ActivityDetailView activityId={draft.id} mode="administration" />
      </div>,
      { adapters },
    );
    const user = setupUser();

    const heading = await screen.findByRole("heading", { level: 1, name: draft.name });
    const openButton = await screen.findByRole("button", { name: "Eliminar borrador" });
    openButton.focus();
    expect(openButton).toHaveFocus();
    await user.keyboard("{Enter}");

    const form = await screen.findByRole("form", { name: `Eliminar borrador "${draft.name}"` });
    expect(heading).toHaveFocus();
    expect(form).toHaveAccessibleName(`Eliminar borrador "${draft.name}"`);
    const confirm = within(form).getByRole("button", { name: "Eliminar borrador" });
    const discard = within(form).getByRole("button", { name: "Volver sin cambios" });
    expect(confirm).toBeVisible();
    expect(discard).toBeVisible();

    discard.focus();
    expect(discard).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(await screen.findByRole("button", { name: "Eliminar borrador" })).toHaveFocus();
  });
});
