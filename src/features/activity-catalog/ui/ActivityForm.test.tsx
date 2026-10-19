import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createAdministrativeActivityDetail } from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import { setupUser } from "@/test/user";

import { ActivityForm } from "./ActivityForm";

const NOTIFICATION_CONTROL_NAME = /notificar|avisar.*(?:asistentes|inscritos)|enviar.*correos/i;

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

describe("ActivityForm", () => {
  it("should not offer a notification control in the create form", () => {
    renderWithProviders(
      <ActivityForm
        failure={null}
        isSubmitting={false}
        mode="create"
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
        programId="program-1"
        programName="Semana de Innovacion Academica"
      />,
    );

    expectNoNotificationControls(screen.getByRole("form", { name: "Nueva actividad" }));
  });

  it("should not offer a notification control when editing an activity with enrolled attendees", () => {
    const original = createAdministrativeActivityDetail({ enrolledCount: 7 });

    renderWithProviders(
      <ActivityForm
        failure={null}
        isSubmitting={false}
        mode="edit"
        onCancel={vi.fn()}
        onRefresh={vi.fn()}
        onSubmit={vi.fn()}
        original={original}
        programName="Semana de Innovacion Academica"
      />,
    );

    const form = screen.getByRole("form", { name: "Editar actividad" });
    expectNoNotificationControls(form);
    expect(within(form).getByRole("textbox", { name: "Nombre" })).toHaveValue(original.name);
  });

  it("should keep the speaker email contract field without adding a notification control", async () => {
    const user = setupUser();
    const original = createAdministrativeActivityDetail({ enrolledCount: 4 });

    renderWithProviders(
      <ActivityForm
        failure={null}
        isSubmitting={false}
        mode="edit"
        onCancel={vi.fn()}
        onRefresh={vi.fn()}
        onSubmit={vi.fn()}
        original={original}
        programName="Semana de Innovacion Academica"
      />,
    );

    const form = screen.getByRole("form", { name: "Editar actividad" });
    await user.click(within(form).getByRole("button", { name: "Agregar ponente" }));

    expect(within(form).getByRole("textbox", { name: "Correo del ponente 1" })).toBeInTheDocument();
    expectNoNotificationControls(form);
  });
});
