import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import { setupUser } from "@/test/user";

import { ActivityDetailView } from "./ActivityDetailView";

const AVAILABILITY_CRITERIA = { date: "2026-08-24", endTime: "09:00", startTime: "08:00" };

function authenticateAdministrator() {
  useSessionStore.setState({
    currentUser: createAuthenticatedUser({ globalRole: "ADMIN", id: "admin-1" }),
    tokens: createAuthTokens(),
  });
}

function createDraftActivity(adapters: AppAdapters) {
  return adapters.activities.createActivity({
    classroomId: "aula-10",
    date: "2026-08-24",
    endTime: "09:00",
    eventProgramId: "program-fisc-default",
    maxCapacity: 30,
    name: "Actividad de ciclo integrado",
    startTime: "08:00",
    type: "WORKSHOP",
  });
}

async function publicActivityIds(adapters: AppAdapters) {
  const catalog = await adapters.publicActivityCatalog.loadPublicActivities();

  return catalog.activities.map((activity) => activity.id);
}

async function availableClassroomIds(adapters: AppAdapters) {
  const classrooms = await adapters.classrooms.loadAvailableClassrooms!(AVAILABILITY_CRITERIA);

  return classrooms.map((classroom) => classroom.id);
}

afterEach(() => {
  useSessionStore.getState().clearSession();
});

describe("ActivityLifecycle integration", () => {
  it("walks a draft activity through publication, unpublication and cancellation across the public projection and availability", async () => {
    authenticateAdministrator();
    const adapters = createAppAdapters({ source: "mock" });
    const draft = await createDraftActivity(adapters);

    renderWithProviders(<ActivityDetailView activityId={draft.id} mode="administration" />, {
      adapters,
    });
    const user = setupUser();

    await screen.findByRole("heading", { level: 1, name: draft.name });
    expect(await publicActivityIds(adapters)).not.toContain(draft.id);
    await expect(adapters.publicActivityCatalog.getPublicActivity(draft.id)).resolves.toBeNull();
    expect(await availableClassroomIds(adapters)).toContain("aula-10");

    await user.click(screen.getByRole("button", { name: "Publicar actividad" }));
    await user.click(screen.getByRole("button", { name: "Confirmar publicación" }));
    expect(await screen.findByText(/se publicó/i)).toBeInTheDocument();
    expect(await publicActivityIds(adapters)).toContain(draft.id);
    await expect(adapters.publicActivityCatalog.getPublicActivity(draft.id)).resolves.toMatchObject(
      { id: draft.id },
    );
    expect(await availableClassroomIds(adapters)).not.toContain("aula-10");

    await user.click(await screen.findByRole("button", { name: "Despublicar actividad" }));
    await user.click(screen.getByRole("button", { name: "Confirmar despublicación" }));
    expect(await screen.findByText(/volvió a borrador/i)).toBeInTheDocument();
    expect(await publicActivityIds(adapters)).not.toContain(draft.id);
    await expect(adapters.publicActivityCatalog.getPublicActivity(draft.id)).resolves.toBeNull();
    expect(await availableClassroomIds(adapters)).toContain("aula-10");

    await user.click(await screen.findByRole("button", { name: "Publicar actividad" }));
    await user.click(screen.getByRole("button", { name: "Confirmar publicación" }));
    expect(await screen.findByText(/se publicó/i)).toBeInTheDocument();
    expect(await publicActivityIds(adapters)).toContain(draft.id);

    await user.click(await screen.findByRole("button", { name: "Cancelar actividad" }));
    const form = screen.getByRole("form", { name: `Cancelar actividad "${draft.name}"` });
    await user.type(
      within(form).getByRole("textbox", { name: "Motivo de cancelación — opcional" }),
      "Cierre del campus",
    );
    await user.click(within(form).getByRole("button", { name: "Confirmar cancelación" }));
    expect(await screen.findByText(/se canceló/i)).toBeInTheDocument();
    expect(await publicActivityIds(adapters)).not.toContain(draft.id);
    await expect(adapters.publicActivityCatalog.getPublicActivity(draft.id)).resolves.toMatchObject(
      { cancelReason: "Cierre del campus", status: "CANCELLED" },
    );
    expect(await availableClassroomIds(adapters)).toContain("aula-10");
  });

  it("confirms the lifecycle by keyboard and keeps a predictable focus", async () => {
    authenticateAdministrator();
    const adapters = createAppAdapters({ source: "mock" });
    const draft = await createDraftActivity(adapters);

    renderWithProviders(<ActivityDetailView activityId={draft.id} mode="administration" />, {
      adapters,
    });
    const user = setupUser();

    const heading = await screen.findByRole("heading", { level: 1, name: draft.name });
    const publish = screen.getByRole("button", { name: "Publicar actividad" });
    publish.focus();
    expect(publish).toHaveFocus();
    await user.keyboard("{Enter}");

    const confirm = await screen.findByRole("button", { name: "Confirmar publicación" });
    expect(heading).toHaveFocus();
    confirm.focus();
    expect(confirm).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(await screen.findByText(/se publicó/i)).toBeInTheDocument();
    expect(heading).toHaveFocus();
  });

  it("keeps the confirmation named and reachable inside a 320 px container", async () => {
    authenticateAdministrator();
    const adapters = createAppAdapters({ source: "mock" });
    const draft = await createDraftActivity(adapters);

    renderWithProviders(
      <div style={{ width: 320 }}>
        <ActivityDetailView activityId={draft.id} mode="administration" />
      </div>,
      { adapters },
    );
    const user = setupUser();

    await screen.findByRole("heading", { level: 1, name: draft.name });
    await user.click(await screen.findByRole("button", { name: "Cancelar actividad" }));

    const form = screen.getByRole("form", { name: `Cancelar actividad "${draft.name}"` });
    expect(form).toHaveAccessibleName(`Cancelar actividad "${draft.name}"`);
    expect(
      within(form).getByRole("textbox", { name: "Motivo de cancelación — opcional" }),
    ).toBeVisible();
    expect(within(form).getByRole("button", { name: "Volver sin cambios" })).toBeVisible();
    expect(within(form).getByRole("button", { name: "Confirmar cancelación" })).toBeVisible();
  });
});
