import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { setupUser } from "@/test/user";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes, useLocation } from "react-router";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import {
  createAdministrativeActivityDetail,
  createAuthenticatedUser,
  createAuthTokens,
  createEventProgramListItem,
  createUserScope,
} from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import type { EventProgramStatus } from "@/types/domain";
import type { UserScopePermission } from "@/features/collaboration";

import { ActivityDetailView } from "./ActivityDetailView";

function setAdminSession() {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole: "ADMIN", id: "admin-1" }),
    tokens: createAuthTokens(),
  });
}

function setUserSession() {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole: "USER", id: "user-1" }),
    tokens: createAuthTokens(),
  });
}

function detailAdapters(
  options: {
    cancelActivity?: (activityId: string, request: unknown) => Promise<unknown>;
    deleteActivity?: (activityId: string) => Promise<void>;
    detail?: ReturnType<typeof createAdministrativeActivityDetail>;
    getActivity?: (
      activityId: string,
    ) => Promise<ReturnType<typeof createAdministrativeActivityDetail>>;
    programStatus?: EventProgramStatus;
    updateActivity?: (activityId: string, request: unknown) => Promise<unknown>;
  } = {},
) {
  const adapters = createAppAdapters({ source: "mock" });
  const detail = options.detail ?? createAdministrativeActivityDetail();
  adapters.activities = {
    ...adapters.activities,
    cancelActivity: options.cancelActivity
      ? vi.fn(options.cancelActivity as never)
      : vi.fn().mockResolvedValue(detail),
    deleteActivity: options.deleteActivity
      ? vi.fn(options.deleteActivity as never)
      : vi.fn().mockResolvedValue(undefined),
    getActivity: options.getActivity
      ? vi.fn(options.getActivity as never)
      : vi.fn().mockResolvedValue(detail),
    updateActivity: options.updateActivity
      ? vi.fn(options.updateActivity as never)
      : vi.fn().mockResolvedValue(detail),
  };
  adapters.eventPrograms = {
    ...adapters.eventPrograms,
    loadEventPrograms: vi.fn().mockResolvedValue([
      createEventProgramListItem({
        id: detail.eventProgram.id,
        name: detail.eventProgram.name,
        status: options.programStatus ?? "ACTIVE",
      }),
    ]),
  };

  return adapters;
}

function permission(name: string): UserScopePermission {
  return { name, origin: "LOCAL", validFrom: null, validUntil: null };
}

function scopedAdapters(
  detail: ReturnType<typeof createAdministrativeActivityDetail>,
  permissions: UserScopePermission[],
): AppAdapters {
  const adapters = detailAdapters({ detail });
  adapters.userScopes = {
    ...adapters.userScopes,
    loadUserScopes: vi.fn().mockResolvedValue([
      createUserScope({
        id: detail.eventProgram.id,
        name: detail.eventProgram.name,
        permissions,
        status: "ACTIVE",
        type: "program",
      }),
    ]),
  };

  return adapters;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
}

function directActivityAdapters(
  detail: ReturnType<typeof createAdministrativeActivityDetail>,
  permissions: UserScopePermission[],
): AppAdapters {
  const adapters = detailAdapters({ detail });
  adapters.userScopes = {
    ...adapters.userScopes,
    loadUserScopes: vi.fn().mockResolvedValue([
      createUserScope({
        eventProgram: {
          id: detail.eventProgram.id,
          label: detail.eventProgram.label,
          name: detail.eventProgram.name,
          status: "ACTIVE",
        },
        id: detail.id,
        name: detail.name,
        permissions,
        type: "activity",
      }),
    ]),
  };

  return adapters;
}

/** Sonda de destino: expone la ruta alcanzada tras navegar. */
function DestinationHeading() {
  return <h1>{useLocation().pathname}</h1>;
}

const NOTIFICATION_CONTROL_NAME = /notificar|avisar.*(?:asistentes|inscritos)|enviar.*correos/i;
const EXCLUDED_RESULT_COPY =
  /notificó a los asistentes|enviaron los correos|notificación quedó en cola|no se enviaron notificaciones|serán avisados automáticamente/i;
const EMAIL_ATTRIBUTION = /correo|notificaci/i;

function expectNoNotificationControls(scope: HTMLElement) {
  const queries = within(scope);

  expect(
    queries.queryByRole("checkbox", { name: NOTIFICATION_CONTROL_NAME }),
  ).not.toBeInTheDocument();
  expect(
    queries.queryByRole("switch", { name: NOTIFICATION_CONTROL_NAME }),
  ).not.toBeInTheDocument();
  expect(queries.queryByRole("radio", { name: NOTIFICATION_CONTROL_NAME })).not.toBeInTheDocument();
  expect(
    queries.queryByRole("button", { name: NOTIFICATION_CONTROL_NAME }),
  ).not.toBeInTheDocument();
}

describe("ActivityDetailView", () => {
  beforeEach(() => {
    setAdminSession();
  });

  afterEach(() => {
    useSessionStore.getState().clearSession();
  });

  it("should show the complete detail with program, classroom and equipment", async () => {
    const detail = createAdministrativeActivityDetail({
      equipment: ["Proyector", "Audio"],
      speakers: [{ firstName: "Ana", id: "speaker-1", lastName: "Perez" }],
    });

    renderWithProviders(<ActivityDetailView activityId={detail.id} mode="administration" />, {
      adapters: detailAdapters({ detail }),
    });

    expect(await screen.findByRole("heading", { level: 1, name: detail.name })).toBeInTheDocument();
    expect(screen.getByText("Aula 101, Edificio de Aulas")).toBeInTheDocument();
    expect(screen.getByText("Ana Perez")).toBeInTheDocument();
    expect(screen.getByText("Proyector, Audio")).toBeInTheDocument();
    expect(screen.getByText("10 · 0 con asistencia")).toBeInTheDocument();
  });

  it("should patch only the edited description and keep the assigned classroom out of the request", async () => {
    const user = setupUser();
    const detail = createAdministrativeActivityDetail();
    const updateActivity = vi.fn().mockResolvedValue({ ...detail, description: "Nueva" });

    renderWithProviders(<ActivityDetailView activityId={detail.id} mode="administration" />, {
      adapters: detailAdapters({ detail, updateActivity }),
    });

    await user.click(await screen.findByRole("button", { name: "Editar actividad" }));
    const form = within(screen.getByRole("form", { name: "Editar actividad" }));
    const description = form.getByRole("textbox", { name: "Descripción" });
    await user.clear(description);
    await user.type(description, "Nueva");
    await user.click(form.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(updateActivity).toHaveBeenCalledWith(detail.id, { description: "Nueva" }),
    );
    expect(
      await screen.findByText(/los cambios de «actividad de prueba» se guardaron/i),
    ).toBeInTheDocument();
  });

  it("should preserve the form after a 409 and offer a detail refresh", async () => {
    const user = setupUser();
    const detail = createAdministrativeActivityDetail();
    const updateActivity = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("conflicto"), { status: 409 }));
    const adapters = detailAdapters({ detail, updateActivity });

    renderWithProviders(<ActivityDetailView activityId={detail.id} mode="administration" />, {
      adapters,
    });

    await user.click(await screen.findByRole("button", { name: "Editar actividad" }));
    const form = within(screen.getByRole("form", { name: "Editar actividad" }));
    const name = form.getByRole("textbox", { name: "Nombre" });
    await user.clear(name);
    await user.type(name, "Nombre conservado");
    await user.click(form.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/aula pudo ser reservada/i);
    expect(form.getByRole("textbox", { name: "Nombre" })).toHaveValue("Nombre conservado");

    const getActivity = vi.mocked(adapters.activities.getActivity);
    const callsBefore = getActivity.mock.calls.length;
    await user.click(screen.getByRole("button", { name: "Actualizar actividad" }));
    await waitFor(() => expect(getActivity.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it("should save a description edit against the shared mock without revalidating the reservation", async () => {
    const user = setupUser();

    renderWithProviders(
      <ActivityDetailView activityId="activity-open-data-governance" mode="administration" />,
    );

    await user.click(await screen.findByRole("button", { name: "Editar actividad" }));
    const form = within(screen.getByRole("form", { name: "Editar actividad" }));
    const description = form.getByRole("textbox", { name: "Descripción" });
    await user.clear(description);
    await user.type(description, "Otra descripcion");
    await user.click(form.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText(/se guardaron/i)).toBeInTheDocument();
  });

  it("should offer publish and cancel for a draft activity to an administrator", async () => {
    const detail = createAdministrativeActivityDetail({ status: "DRAFT" });

    renderWithProviders(<ActivityDetailView activityId={detail.id} mode="administration" />, {
      adapters: detailAdapters({ detail }),
    });

    expect(await screen.findByRole("button", { name: "Publicar actividad" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Cancelar actividad" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Despublicar actividad" })).not.toBeInTheDocument();
  });

  it("should offer unpublish and cancel for a scheduled activity to an administrator", async () => {
    const detail = createAdministrativeActivityDetail({ status: "SCHEDULED" });

    renderWithProviders(<ActivityDetailView activityId={detail.id} mode="administration" />, {
      adapters: detailAdapters({ detail }),
    });

    expect(
      await screen.findByRole("button", { name: "Despublicar actividad" }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Cancelar actividad" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publicar actividad" })).not.toBeInTheDocument();
  });

  it("should allow cancelling an ongoing activity without offering editing", async () => {
    const detail = createAdministrativeActivityDetail({ status: "ONGOING" });

    renderWithProviders(<ActivityDetailView activityId={detail.id} mode="administration" />, {
      adapters: detailAdapters({ detail }),
    });

    await screen.findByRole("heading", { level: 1, name: detail.name });
    expect(await screen.findByRole("button", { name: "Cancelar actividad" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar actividad" })).not.toBeInTheDocument();
    expect(screen.getByText("Edición no disponible")).toBeInTheDocument();
    expect(screen.queryByText("Solo lectura")).not.toBeInTheDocument();
  });

  it("should present completed and cancelled activities without editing or transitions", async () => {
    const completed = createAdministrativeActivityDetail({ status: "COMPLETED" });
    const { unmount } = renderWithProviders(
      <ActivityDetailView activityId={completed.id} mode="administration" />,
      { adapters: detailAdapters({ detail: completed }) },
    );

    await screen.findByRole("heading", { level: 1, name: completed.name });
    expect(screen.queryByRole("button", { name: "Editar actividad" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar actividad" })).not.toBeInTheDocument();
    expect(screen.getByText("Solo lectura")).toBeInTheDocument();
    unmount();

    const cancelled = createAdministrativeActivityDetail({ status: "CANCELLED" });
    renderWithProviders(<ActivityDetailView activityId={cancelled.id} mode="administration" />, {
      adapters: detailAdapters({ detail: cancelled }),
    });

    await screen.findByRole("heading", { level: 1, name: cancelled.name });
    expect(screen.queryByRole("button", { name: "Editar actividad" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar actividad" })).not.toBeInTheDocument();
    expect(screen.getByText("Cancelada")).toBeInTheDocument();
  });

  it("should keep update and cancellation permissions independent", async () => {
    setUserSession();
    const detail = createAdministrativeActivityDetail({ status: "DRAFT" });

    const { unmount } = renderWithProviders(
      <ActivityDetailView activityId={detail.id} mode="operational" />,
      {
        adapters: scopedAdapters(detail, [
          permission("activity:read"),
          permission("activity:update"),
        ]),
      },
    );

    expect(await screen.findByRole("button", { name: "Publicar actividad" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar actividad" })).not.toBeInTheDocument();
    unmount();

    renderWithProviders(<ActivityDetailView activityId={detail.id} mode="operational" />, {
      adapters: scopedAdapters(detail, [
        permission("activity:read"),
        permission("activity:cancel"),
      ]),
    });

    expect(await screen.findByRole("button", { name: "Cancelar actividad" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar actividad" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publicar actividad" })).not.toBeInTheDocument();
  });

  it("should cancel with the trimmed reason and announce the result", async () => {
    const user = setupUser();
    const detail = createAdministrativeActivityDetail({ status: "DRAFT" });
    const cancelActivity = vi
      .fn()
      .mockResolvedValue({ ...detail, cancelReason: "Lluvia intensa", status: "CANCELLED" });

    renderWithProviders(<ActivityDetailView activityId={detail.id} mode="administration" />, {
      adapters: detailAdapters({ cancelActivity, detail }),
    });

    await user.click(await screen.findByRole("button", { name: "Cancelar actividad" }));
    const form = screen.getByRole("form", { name: `Cancelar actividad "${detail.name}"` });
    await user.type(
      within(form).getByRole("textbox", { name: "Motivo de cancelación — opcional" }),
      "  Lluvia intensa  ",
    );
    await user.click(within(form).getByRole("button", { name: "Confirmar cancelación" }));

    await waitFor(() =>
      expect(cancelActivity).toHaveBeenCalledWith(detail.id, { reason: "Lluvia intensa" }),
    );
    expect(
      await screen.findByText(/la actividad «actividad de prueba» se canceló/i),
    ).toBeInTheDocument();
  });

  it("should cancel without a reason as an empty request", async () => {
    const user = setupUser();
    const detail = createAdministrativeActivityDetail({ status: "DRAFT" });
    const cancelActivity = vi.fn().mockResolvedValue({ ...detail, status: "CANCELLED" });

    renderWithProviders(<ActivityDetailView activityId={detail.id} mode="administration" />, {
      adapters: detailAdapters({ cancelActivity, detail }),
    });

    await user.click(await screen.findByRole("button", { name: "Cancelar actividad" }));
    await user.click(screen.getByRole("button", { name: "Confirmar cancelación" }));

    await waitFor(() => expect(cancelActivity).toHaveBeenCalledWith(detail.id, {}));
  });

  it("should keep the reason after a 409 and refresh without resending", async () => {
    const user = setupUser();
    const detail = createAdministrativeActivityDetail({ status: "DRAFT" });
    const cancelActivity = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("conflicto"), { status: 409 }));
    const adapters = detailAdapters({ cancelActivity, detail });

    renderWithProviders(<ActivityDetailView activityId={detail.id} mode="administration" />, {
      adapters,
    });

    await user.click(await screen.findByRole("button", { name: "Cancelar actividad" }));
    const form = screen.getByRole("form", { name: `Cancelar actividad "${detail.name}"` });
    const reason = within(form).getByRole("textbox", {
      name: "Motivo de cancelación — opcional",
    });
    await user.type(reason, "Motivo conservado");
    await user.click(within(form).getByRole("button", { name: "Confirmar cancelación" }));

    expect(await screen.findByText(/programa dejó de estar activo/i)).toBeInTheDocument();
    expect(reason).toHaveValue("Motivo conservado");

    const getActivity = vi.mocked(adapters.activities.getActivity);
    const callsBefore = getActivity.mock.calls.length;
    await user.click(screen.getByRole("button", { name: "Actualizar actividad" }));
    await waitFor(() => expect(getActivity.mock.calls.length).toBeGreaterThan(callsBefore));
    expect(cancelActivity).toHaveBeenCalledTimes(1);
  });

  it("should disable the confirmation when the activity changed while the panel was open", async () => {
    const user = setupUser();
    let detail = createAdministrativeActivityDetail({ status: "DRAFT" });
    const getActivity = vi.fn(() => Promise.resolve(detail));
    const cancelActivity = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("conflicto"), { status: 409 }));
    const adapters = detailAdapters({ cancelActivity, detail, getActivity });

    renderWithProviders(<ActivityDetailView activityId={detail.id} mode="administration" />, {
      adapters,
    });

    await user.click(await screen.findByRole("button", { name: "Cancelar actividad" }));
    const form = screen.getByRole("form", { name: `Cancelar actividad "${detail.name}"` });
    const reason = within(form).getByRole("textbox", {
      name: "Motivo de cancelación — opcional",
    });
    await user.type(reason, "Motivo conservado");
    await user.click(within(form).getByRole("button", { name: "Confirmar cancelación" }));
    expect(await screen.findByText(/programa dejó de estar activo/i)).toBeInTheDocument();

    detail = createAdministrativeActivityDetail({ status: "COMPLETED" });
    await user.click(screen.getByRole("button", { name: "Actualizar actividad" }));

    expect(await screen.findByText(/ya no está disponible/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar cancelación" })).toBeDisabled();
    expect(reason).toHaveValue("Motivo conservado");
  });

  it("should send a single cancel request despite repeated activations", async () => {
    const detail = createAdministrativeActivityDetail({ status: "DRAFT" });
    const pending = deferred<unknown>();
    const cancelActivity = vi.fn().mockReturnValue(pending.promise);

    renderWithProviders(<ActivityDetailView activityId={detail.id} mode="administration" />, {
      adapters: detailAdapters({ cancelActivity, detail }),
    });

    const user = setupUser();
    await user.click(await screen.findByRole("button", { name: "Cancelar actividad" }));
    const confirm = await screen.findByRole("button", { name: "Confirmar cancelación" });
    fireEvent.click(confirm);
    await waitFor(() => expect(cancelActivity).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Confirmando..." }));
    expect(cancelActivity).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve({ ...detail, status: "CANCELLED" });
      await pending.promise;
    });
  });

  it("should keep editing and confirmation exclusive", async () => {
    const user = setupUser();
    const detail = createAdministrativeActivityDetail({ status: "DRAFT" });

    renderWithProviders(<ActivityDetailView activityId={detail.id} mode="administration" />, {
      adapters: detailAdapters({ detail }),
    });

    await user.click(await screen.findByRole("button", { name: "Editar actividad" }));
    expect(screen.getByRole("form", { name: "Editar actividad" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publicar actividad" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar actividad" })).not.toBeInTheDocument();

    await user.click(
      within(screen.getByRole("form", { name: "Editar actividad" })).getByRole("button", {
        name: "Cancelar",
      }),
    );
    await user.click(await screen.findByRole("button", { name: "Publicar actividad" }));
    expect(
      screen.getByRole("form", { name: `Publicar actividad "${detail.name}"` }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Editar actividad" })).not.toBeInTheDocument();
  });

  it("should move focus to the heading and back to the opening button", async () => {
    const user = setupUser();
    const detail = createAdministrativeActivityDetail({ status: "DRAFT" });

    renderWithProviders(<ActivityDetailView activityId={detail.id} mode="administration" />, {
      adapters: detailAdapters({ detail }),
    });

    const heading = await screen.findByRole("heading", { level: 1, name: detail.name });
    await user.click(screen.getByRole("button", { name: "Publicar actividad" }));
    expect(heading).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Volver sin cambios" }));
    expect(screen.getByRole("button", { name: "Publicar actividad" })).toHaveFocus();
  });

  it("should move focus to the heading after a successful action", async () => {
    const user = setupUser();
    const detail = createAdministrativeActivityDetail({ status: "DRAFT" });

    renderWithProviders(<ActivityDetailView activityId={detail.id} mode="administration" />, {
      adapters: detailAdapters({ detail }),
    });

    const heading = await screen.findByRole("heading", { level: 1, name: detail.name });
    await user.click(screen.getByRole("button", { name: "Publicar actividad" }));
    await user.click(screen.getByRole("button", { name: "Confirmar publicación" }));

    expect(
      await screen.findByText(/la actividad «actividad de prueba» se publicó/i),
    ).toBeInTheDocument();
    expect(heading).toHaveFocus();
  });

  it("should present a non-editable activity as edit unavailable", async () => {
    const detail = createAdministrativeActivityDetail({ status: "ONGOING" });

    renderWithProviders(<ActivityDetailView activityId={detail.id} mode="administration" />, {
      adapters: detailAdapters({ detail }),
    });

    await screen.findByRole("heading", { level: 1, name: detail.name });
    expect(screen.queryByRole("button", { name: "Editar actividad" })).not.toBeInTheDocument();
    expect(screen.getByText("Edición no disponible")).toBeInTheDocument();
  });

  it("should explain a cancelled activity with its reason", async () => {
    const detail = createAdministrativeActivityDetail({
      cancelReason: "Lluvia intensa",
      status: "CANCELLED",
    });

    renderWithProviders(<ActivityDetailView activityId={detail.id} mode="administration" />, {
      adapters: detailAdapters({ detail }),
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("Cancelada: Lluvia intensa");
  });

  it("should offer delete only for a draft in an active program to an administrator", async () => {
    const detail = createAdministrativeActivityDetail({ status: "DRAFT" });

    renderWithProviders(<ActivityDetailView activityId={detail.id} mode="administration" />, {
      adapters: detailAdapters({ detail }),
    });

    expect(await screen.findByRole("button", { name: "Eliminar borrador" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publicar actividad" })).toBeInTheDocument();
  });

  it.each(["SCHEDULED", "ONGOING", "COMPLETED", "CANCELLED"] as const)(
    "should not offer delete for a %s activity",
    async (status) => {
      const detail = createAdministrativeActivityDetail({ status });

      renderWithProviders(<ActivityDetailView activityId={detail.id} mode="administration" />, {
        adapters: detailAdapters({ detail }),
      });

      await screen.findByRole("heading", { level: 1, name: detail.name });
      expect(screen.queryByRole("button", { name: "Eliminar borrador" })).not.toBeInTheDocument();
    },
  );

  it.each(["DRAFT", "COMPLETED", "CANCELLED", "ARCHIVED"] as const)(
    "should not offer delete when the program is %s",
    async (programStatus) => {
      const detail = createAdministrativeActivityDetail({ status: "DRAFT" });

      renderWithProviders(<ActivityDetailView activityId={detail.id} mode="administration" />, {
        adapters: detailAdapters({ detail, programStatus }),
      });

      await screen.findByRole("heading", { level: 1, name: detail.name });
      expect(screen.queryByRole("button", { name: "Eliminar borrador" })).not.toBeInTheDocument();
    },
  );

  it("should not offer delete while the detail is still loading", async () => {
    const detail = createAdministrativeActivityDetail({ status: "DRAFT" });
    const gate = deferred<ReturnType<typeof createAdministrativeActivityDetail>>();
    const adapters = detailAdapters({ detail });
    adapters.activities.getActivity = vi.fn().mockReturnValue(gate.promise);

    renderWithProviders(<ActivityDetailView activityId={detail.id} mode="administration" />, {
      adapters,
    });

    expect(screen.queryByRole("button", { name: "Eliminar borrador" })).not.toBeInTheDocument();

    await act(async () => {
      gate.resolve(detail);
      await gate.promise;
    });
    expect(await screen.findByRole("button", { name: "Eliminar borrador" })).toBeInTheDocument();
  });

  it("should not offer delete when the program query fails", async () => {
    const detail = createAdministrativeActivityDetail({ status: "DRAFT" });
    const adapters = detailAdapters({ detail });
    adapters.eventPrograms = {
      ...adapters.eventPrograms,
      loadEventPrograms: vi.fn().mockRejectedValue(new Error("sin programa")),
    };

    renderWithProviders(<ActivityDetailView activityId={detail.id} mode="administration" />, {
      adapters,
    });

    await screen.findByRole("heading", { level: 1, name: detail.name });
    expect(screen.queryByRole("button", { name: "Eliminar borrador" })).not.toBeInTheDocument();
  });

  it("should gate delete by the effective delete permission, not by update or cancel", async () => {
    setUserSession();
    const detail = createAdministrativeActivityDetail({ status: "DRAFT" });

    const { unmount } = renderWithProviders(
      <ActivityDetailView activityId={detail.id} mode="operational" />,
      {
        adapters: scopedAdapters(detail, [
          permission("activity:read"),
          permission("activity:update"),
          permission("activity:cancel"),
        ]),
      },
    );

    await screen.findByRole("button", { name: "Publicar actividad" });
    expect(screen.queryByRole("button", { name: "Eliminar borrador" })).not.toBeInTheDocument();
    unmount();

    renderWithProviders(<ActivityDetailView activityId={detail.id} mode="operational" />, {
      adapters: scopedAdapters(detail, [
        permission("activity:read"),
        permission("activity:delete"),
      ]),
    });

    expect(await screen.findByRole("button", { name: "Eliminar borrador" })).toBeInTheDocument();
  });

  it("should keep the delete confirmation after a 409 and refresh without resending", async () => {
    const user = setupUser();
    const detail = createAdministrativeActivityDetail({ status: "DRAFT" });
    const deleteActivity = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("conflicto"), { status: 409 }));
    const adapters = detailAdapters({ deleteActivity, detail });

    renderWithProviders(<ActivityDetailView activityId={detail.id} mode="administration" />, {
      adapters,
    });

    await user.click(await screen.findByRole("button", { name: "Eliminar borrador" }));
    const form = screen.getByRole("form", { name: `Eliminar borrador "${detail.name}"` });
    await user.click(within(form).getByRole("button", { name: "Eliminar borrador" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /registros de asistencia o alertas que deben conservarse/i,
    );
    expect(
      screen.getByRole("form", { name: `Eliminar borrador "${detail.name}"` }),
    ).toBeInTheDocument();

    const getActivity = vi.mocked(adapters.activities.getActivity);
    const callsBefore = getActivity.mock.calls.length;
    await user.click(screen.getByRole("button", { name: "Actualizar actividad" }));
    await waitFor(() => expect(getActivity.mock.calls.length).toBeGreaterThan(callsBefore));
    expect(deleteActivity).toHaveBeenCalledTimes(1);
  });

  it("should retire the delete option when a reread finds the draft published", async () => {
    const user = setupUser();
    let detail = createAdministrativeActivityDetail({ status: "DRAFT" });
    const getActivity = vi.fn(() => Promise.resolve(detail));
    const deleteActivity = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("conflicto"), { status: 409 }));
    const adapters = detailAdapters({ deleteActivity, detail, getActivity });

    renderWithProviders(<ActivityDetailView activityId={detail.id} mode="administration" />, {
      adapters,
    });

    await user.click(await screen.findByRole("button", { name: "Eliminar borrador" }));
    await user.click(screen.getByRole("button", { name: "Eliminar borrador" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/registros de asistencia/i);

    detail = createAdministrativeActivityDetail({ status: "SCHEDULED" });
    await user.click(screen.getByRole("button", { name: "Actualizar actividad" }));

    expect(await screen.findByText(/ya no está disponible/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar borrador" })).toBeDisabled();
  });

  it("should not cancel the activity automatically when deletion fails", async () => {
    const user = setupUser();
    const detail = createAdministrativeActivityDetail({ status: "DRAFT" });
    const cancelActivity = vi.fn().mockResolvedValue(detail);
    const deleteActivity = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("conflicto"), { status: 409 }));
    const adapters = detailAdapters({ cancelActivity, deleteActivity, detail });

    renderWithProviders(<ActivityDetailView activityId={detail.id} mode="administration" />, {
      adapters,
    });

    await user.click(await screen.findByRole("button", { name: "Eliminar borrador" }));
    await user.click(screen.getByRole("button", { name: "Eliminar borrador" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/registros de asistencia/i);
    expect(cancelActivity).not.toHaveBeenCalled();
  });

  it("should send a single delete request despite repeated activations", async () => {
    const detail = createAdministrativeActivityDetail({ status: "DRAFT" });
    const pending = deferred<void>();
    const deleteActivity = vi.fn().mockReturnValue(pending.promise);

    renderWithProviders(<ActivityDetailView activityId={detail.id} mode="administration" />, {
      adapters: detailAdapters({ deleteActivity, detail }),
    });

    const user = setupUser();
    await user.click(await screen.findByRole("button", { name: "Eliminar borrador" }));
    const confirm = await screen.findByRole("button", { name: "Eliminar borrador" });
    fireEvent.click(confirm);
    await waitFor(() => expect(deleteActivity).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar borrador" }));
    expect(deleteActivity).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve();
      await pending.promise;
    });
  });

  it("should return an administrator to the program activities after deleting", async () => {
    const user = setupUser();
    const detail = createAdministrativeActivityDetail({ status: "DRAFT" });
    const adapters = detailAdapters({
      deleteActivity: vi.fn().mockResolvedValue(undefined),
      detail,
    });

    renderWithProviders(
      <Routes>
        <Route
          path="/admin/actividades/:activityId"
          element={<ActivityDetailView activityId={detail.id} mode="administration" />}
        />
        <Route path="/admin/programas/:programId/actividades" element={<DestinationHeading />} />
      </Routes>,
      { adapters, route: `/admin/actividades/${detail.id}` },
    );

    await user.click(await screen.findByRole("button", { name: "Eliminar borrador" }));
    await user.click(screen.getByRole("button", { name: "Eliminar borrador" }));

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: `/admin/programas/${detail.eventProgram.id}/actividades`,
      }),
    ).toBeInTheDocument();
  });

  it("should return a direct collaborator to operations after deleting", async () => {
    setUserSession();
    const user = setupUser();
    const detail = createAdministrativeActivityDetail({ status: "DRAFT" });
    const adapters = directActivityAdapters(detail, [
      permission("activity:read"),
      permission("activity:delete"),
    ]);

    renderWithProviders(
      <Routes>
        <Route
          path="/operaciones/actividades/:activityId/detalle"
          element={<ActivityDetailView activityId={detail.id} mode="operational" />}
        />
        <Route path="/operaciones" element={<DestinationHeading />} />
      </Routes>,
      { adapters, route: `/operaciones/actividades/${detail.id}/detalle` },
    );

    await user.click(await screen.findByRole("button", { name: "Eliminar borrador" }));
    await user.click(screen.getByRole("button", { name: "Eliminar borrador" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "/operaciones" }),
    ).toBeInTheDocument();
  });

  it("should return focus to the delete opening button when discarding", async () => {
    const user = setupUser();
    const detail = createAdministrativeActivityDetail({ status: "DRAFT" });

    renderWithProviders(<ActivityDetailView activityId={detail.id} mode="administration" />, {
      adapters: detailAdapters({ detail }),
    });

    await user.click(await screen.findByRole("button", { name: "Eliminar borrador" }));
    await user.click(screen.getByRole("button", { name: "Volver sin cambios" }));

    expect(screen.getByRole("button", { name: "Eliminar borrador" })).toHaveFocus();
  });

  it("should not offer a notification control while editing an activity with enrolled attendees", async () => {
    const user = setupUser();
    const detail = createAdministrativeActivityDetail({ enrolledCount: 7 });

    renderWithProviders(<ActivityDetailView activityId={detail.id} mode="administration" />, {
      adapters: detailAdapters({ detail }),
    });

    await user.click(await screen.findByRole("button", { name: "Editar actividad" }));

    expectNoNotificationControls(screen.getByRole("form", { name: "Editar actividad" }));
  });

  it("should not offer a notification control to an authorized collaborator editing", async () => {
    setUserSession();
    const user = setupUser();
    const detail = createAdministrativeActivityDetail({ enrolledCount: 5, status: "DRAFT" });

    renderWithProviders(<ActivityDetailView activityId={detail.id} mode="operational" />, {
      adapters: scopedAdapters(detail, [
        permission("activity:read"),
        permission("activity:update"),
      ]),
    });

    await user.click(await screen.findByRole("button", { name: "Editar actividad" }));

    expectNoNotificationControls(screen.getByRole("form", { name: "Editar actividad" }));
  });

  it.each([
    ["DRAFT", "Publicar actividad"],
    ["DRAFT", "Cancelar actividad"],
    ["DRAFT", "Eliminar borrador"],
    ["SCHEDULED", "Despublicar actividad"],
    ["SCHEDULED", "Cancelar actividad"],
  ] as const)(
    "should not offer a notification control in the %s confirmation for %s",
    async (status, actionLabel) => {
      const user = setupUser();
      const detail = createAdministrativeActivityDetail({ enrolledCount: 9, status });

      renderWithProviders(<ActivityDetailView activityId={detail.id} mode="administration" />, {
        adapters: detailAdapters({ detail }),
      });

      await user.click(await screen.findByRole("button", { name: actionLabel }));

      expectNoNotificationControls(
        screen.getByRole("form", { name: `${actionLabel} "${detail.name}"` }),
      );
    },
  );

  it("should announce the publication without promising attendee notifications", async () => {
    const user = setupUser();
    const detail = createAdministrativeActivityDetail({ enrolledCount: 8, status: "DRAFT" });

    renderWithProviders(<ActivityDetailView activityId={detail.id} mode="administration" />, {
      adapters: detailAdapters({ detail }),
    });

    await user.click(await screen.findByRole("button", { name: "Publicar actividad" }));
    await user.click(screen.getByRole("button", { name: "Confirmar publicación" }));

    const notice = await screen.findByText(/la actividad «actividad de prueba» se publicó/i);
    expect(notice.textContent).not.toMatch(EXCLUDED_RESULT_COPY);
  });

  it("should not attribute an edit failure to an email delivery", async () => {
    const user = setupUser();
    const detail = createAdministrativeActivityDetail();
    const updateActivity = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("conflicto"), { status: 409 }));

    renderWithProviders(<ActivityDetailView activityId={detail.id} mode="administration" />, {
      adapters: detailAdapters({ detail, updateActivity }),
    });

    await user.click(await screen.findByRole("button", { name: "Editar actividad" }));
    const form = within(screen.getByRole("form", { name: "Editar actividad" }));
    await user.click(form.getByRole("button", { name: "Guardar cambios" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).not.toMatch(EMAIL_ATTRIBUTION);
  });

  it("should not send any command when discarding a lifecycle confirmation", async () => {
    const user = setupUser();
    const detail = createAdministrativeActivityDetail({ status: "DRAFT" });
    const cancelActivity = vi.fn().mockResolvedValue(detail);
    const deleteActivity = vi.fn().mockResolvedValue(undefined);
    const updateActivity = vi.fn().mockResolvedValue(detail);

    renderWithProviders(<ActivityDetailView activityId={detail.id} mode="administration" />, {
      adapters: detailAdapters({ cancelActivity, deleteActivity, detail, updateActivity }),
    });

    await user.click(await screen.findByRole("button", { name: "Publicar actividad" }));
    await user.click(screen.getByRole("button", { name: "Volver sin cambios" }));

    expect(updateActivity).not.toHaveBeenCalled();
    expect(cancelActivity).not.toHaveBeenCalled();
    expect(deleteActivity).not.toHaveBeenCalled();
  });
});
