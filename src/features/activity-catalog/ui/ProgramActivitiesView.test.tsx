import { fireEvent, screen, within } from "@testing-library/react";
import { useEffect } from "react";
import { Route, Routes, useNavigate } from "react-router";
import { setupUser } from "@/test/user";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { AppAdapters } from "@/app/adapters";
import { createAppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createAuthTokens, createUserScope } from "@/test/factories";
import { renderWithProviders } from "@/test/render";

import { ProgramActivitiesView } from "./ProgramActivitiesView";

const PROGRAM_ID = "program-innovation-week";

function setSession(role: "ADMIN" | "USER") {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole: role, id: `${role.toLowerCase()}-1` }),
    tokens: createAuthTokens(),
  });
}

function collaboratorAdapters(
  permissions: string[],
  options: { withUpdate?: boolean } = {},
): AppAdapters {
  const adapters = createAppAdapters({ source: "mock" });
  adapters.userScopes = {
    loadUserScopes: () =>
      Promise.resolve([
        createUserScope({
          id: PROGRAM_ID,
          name: "Semana de Innovacion Academica",
          organizationalUnit: {
            id: "fisc",
            name: "Facultad de Ingenieria de Sistemas Computacionales",
            type: "FACULTY",
          },
          permissions: permissions.map((name) => ({
            name,
            origin: "LOCAL" as const,
            validFrom: null,
            validUntil: null,
          })),
          status: "ACTIVE",
          type: "program",
        }),
      ]),
  };
  if (options.withUpdate) {
    const original = adapters.activities.getActivity;
    adapters.activities = {
      ...adapters.activities,
      getActivity: original,
      updateActivity: () => Promise.reject(new Error("no usado")),
    };
  }

  return adapters;
}

/** Sonda de navegación: entrega el anuncio de eliminación como estado de la ruta destino. */
function DeletionNoticeNavigator({ message }: { message: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    void navigate(`/admin/programas/${PROGRAM_ID}/actividades`, {
      state: { activityDeletionNotice: message },
    });
  }, [message, navigate]);
  return null;
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

describe("ProgramActivitiesView", () => {
  beforeEach(() => {
    setSession("ADMIN");
  });

  afterEach(() => {
    useSessionStore.getState().clearSession();
  });

  it("should list the program activities with their status and classroom", async () => {
    renderWithProviders(<ProgramActivitiesView mode="administration" programId={PROGRAM_ID} />);

    expect(
      await screen.findByRole("article", {
        name: /gobernanza de datos abiertos universitarios/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Programada").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Nueva actividad" })).toBeInTheDocument();
  });

  it("should search activities by name through the server", async () => {
    const user = setupUser();

    renderWithProviders(<ProgramActivitiesView mode="administration" programId={PROGRAM_ID} />);
    await screen.findByRole("article", { name: /gobernanza/i });

    await user.type(screen.getByRole("textbox", { name: "Buscar actividades" }), "ciberseguridad");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(
      await screen.findByRole("article", { name: /ciberseguridad en servicios estudiantiles/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("article", { name: /gobernanza de datos abiertos universitarios/i }),
    ).not.toBeInTheDocument();
  });

  it("should create an activity as a draft and show it in the list", async () => {
    const user = setupUser();

    renderWithProviders(<ProgramActivitiesView mode="administration" programId={PROGRAM_ID} />);
    await screen.findByRole("article", { name: /gobernanza/i });

    await user.click(screen.getByRole("button", { name: "Nueva actividad" }));
    const form = within(screen.getByRole("form", { name: "Nueva actividad" }));
    await user.type(form.getByRole("textbox", { name: "Nombre" }), "Feria de ciencias");
    await user.selectOptions(form.getByRole("combobox", { name: "Tipo" }), "WORKSHOP");
    fireEvent.change(form.getByLabelText("Fecha"), { target: { value: "2026-06-20" } });
    fireEvent.change(form.getByLabelText("Hora de inicio"), { target: { value: "09:00" } });
    fireEvent.change(form.getByLabelText("Hora de fin"), { target: { value: "11:00" } });
    await user.click(form.getByRole("button", { name: "Crear actividad" }));

    const notice = await screen.findByText(/se creó como borrador/i);
    expect(notice.textContent).not.toMatch(EXCLUDED_RESULT_COPY);
    expect(await screen.findByRole("article", { name: "Feria de ciencias" })).toBeInTheDocument();
    expect(screen.getAllByText("Borrador").length).toBeGreaterThan(0);
  });

  it("should explain a rejected creation without losing what was written", async () => {
    const user = setupUser();
    const adapters = createAppAdapters({ source: "mock" });
    adapters.activities = {
      ...adapters.activities,
      createActivity: () => Promise.reject(Object.assign(new Error("conflicto"), { status: 409 })),
    };

    renderWithProviders(<ProgramActivitiesView mode="administration" programId={PROGRAM_ID} />, {
      adapters,
    });
    await screen.findByRole("button", { name: "Nueva actividad" });

    await user.click(screen.getByRole("button", { name: "Nueva actividad" }));
    const form = within(screen.getByRole("form", { name: "Nueva actividad" }));
    await user.type(form.getByRole("textbox", { name: "Nombre" }), "Feria de ciencias");
    await user.selectOptions(form.getByRole("combobox", { name: "Tipo" }), "WORKSHOP");
    fireEvent.change(form.getByLabelText("Fecha"), { target: { value: "2026-06-20" } });
    fireEvent.change(form.getByLabelText("Hora de inicio"), { target: { value: "09:00" } });
    fireEvent.change(form.getByLabelText("Hora de fin"), { target: { value: "11:00" } });
    await user.click(form.getByRole("button", { name: "Crear actividad" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/aula pudo ser reservada/i);
    expect(screen.getByRole("alert").textContent).not.toMatch(EMAIL_ATTRIBUTION);
    expect(form.getByRole("textbox", { name: "Nombre" })).toHaveValue("Feria de ciencias");
  });

  it("should deny an operational collaborator without scopes", async () => {
    setSession("USER");

    renderWithProviders(<ProgramActivitiesView mode="operational" programId={PROGRAM_ID} />);

    expect(await screen.findByText("Contexto no autorizado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Nueva actividad" })).not.toBeInTheDocument();
  });

  it("should let a collaborator with read and create permissions manage the program", async () => {
    setSession("USER");
    const adapters = collaboratorAdapters(["activity:read", "activity:create"]);

    renderWithProviders(<ProgramActivitiesView mode="operational" programId={PROGRAM_ID} />, {
      adapters,
    });

    expect(
      await screen.findByRole("article", { name: /gobernanza de datos abiertos universitarios/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nueva actividad" })).toBeInTheDocument();
  });

  it("should hide the creation action from a read-only collaborator", async () => {
    setSession("USER");
    const adapters = collaboratorAdapters(["activity:read"]);

    renderWithProviders(<ProgramActivitiesView mode="operational" programId={PROGRAM_ID} />, {
      adapters,
    });

    await screen.findByRole("article", { name: /gobernanza/i });
    expect(screen.queryByRole("button", { name: "Nueva actividad" })).not.toBeInTheDocument();
  });

  it("should announce the deleted draft and focus the heading", async () => {
    renderWithProviders(
      <Routes>
        <Route
          path="/inicio"
          element={<DeletionNoticeNavigator message="El borrador de «Taller» se eliminó." />}
        />
        <Route
          path="/admin/programas/:programId/actividades"
          element={<ProgramActivitiesView mode="administration" programId={PROGRAM_ID} />}
        />
      </Routes>,
      { route: "/inicio" },
    );

    expect(await screen.findByText("El borrador de «Taller» se eliminó.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Actividades" })).toHaveFocus();
  });

  it("should not offer a notification control in the create form", async () => {
    const user = setupUser();

    renderWithProviders(<ProgramActivitiesView mode="administration" programId={PROGRAM_ID} />);
    await screen.findByRole("button", { name: "Nueva actividad" });

    await user.click(screen.getByRole("button", { name: "Nueva actividad" }));

    expectNoNotificationControls(screen.getByRole("form", { name: "Nueva actividad" }));
  });

  it("should not offer a notification control to a collaborator authorized to create", async () => {
    setSession("USER");
    const user = setupUser();
    const adapters = collaboratorAdapters(["activity:read", "activity:create"]);

    renderWithProviders(<ProgramActivitiesView mode="operational" programId={PROGRAM_ID} />, {
      adapters,
    });
    await screen.findByRole("button", { name: "Nueva actividad" });

    await user.click(screen.getByRole("button", { name: "Nueva actividad" }));

    expectNoNotificationControls(screen.getByRole("form", { name: "Nueva actividad" }));
  });
});
