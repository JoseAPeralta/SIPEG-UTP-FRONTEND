import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";
import { setupUser } from "@/test/user";

import type { ActivityMutationFailure } from "../adapters/activityFailure";
import { ActivityLifecycleConfirmation } from "./ActivityLifecycleConfirmation";

function renderConfirmation(
  props: Partial<React.ComponentProps<typeof ActivityLifecycleConfirmation>> = {},
) {
  const onConfirm = props.onConfirm ?? vi.fn();
  const onDiscard = props.onDiscard ?? vi.fn();

  renderWithProviders(
    <ActivityLifecycleConfirmation
      action="cancel"
      activityName="Taller de datos"
      failure={null}
      isSubmitting={false}
      onConfirm={onConfirm}
      onDiscard={onDiscard}
      {...props}
    />,
  );

  return { onConfirm, onDiscard };
}

const NOTIFICATION_CONTROL_NAME = /notificar|avisar.*(?:asistentes|inscritos)|enviar.*correos/i;
const EMAIL_ATTRIBUTION = /correo|notificaci/i;

const confirmationLabelByAction = {
  cancel: "Cancelar actividad",
  delete: "Eliminar borrador",
  publish: "Publicar actividad",
  unpublish: "Despublicar actividad",
} as const;

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

describe("ActivityLifecycleConfirmation", () => {
  it("should name the form with the action and the activity", () => {
    renderConfirmation({ action: "publish", activityName: "Datos abiertos" });

    expect(
      screen.getByRole("form", { name: 'Publicar actividad "Datos abiertos"' }),
    ).toBeInTheDocument();
  });

  it("should submit a cancel without a reason as an empty request", async () => {
    const user = setupUser();
    const { onConfirm } = renderConfirmation();

    await user.click(screen.getByRole("button", { name: "Confirmar cancelación" }));

    expect(onConfirm).toHaveBeenCalledWith({});
  });

  it("should normalize and send the cancel reason", async () => {
    const user = setupUser();
    const { onConfirm } = renderConfirmation();

    await user.type(
      screen.getByRole("textbox", { name: "Motivo de cancelación — opcional" }),
      "  Lluvia intensa  ",
    );
    await user.click(screen.getByRole("button", { name: "Confirmar cancelación" }));

    expect(onConfirm).toHaveBeenCalledWith({ reason: "Lluvia intensa" });
  });

  it("should reject a reason longer than the contract limit without sending", async () => {
    const user = setupUser();
    const { onConfirm } = renderConfirmation();

    await user.type(
      screen.getByRole("textbox", { name: "Motivo de cancelación — opcional" }),
      "a".repeat(501),
    );
    await user.click(screen.getByRole("button", { name: "Confirmar cancelación" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText(/500 caracteres/i)).toBeInTheDocument();
  });

  it("should expose the typed recovery copy and offer a refresh without resending", async () => {
    const user = setupUser();
    const onRefresh = vi.fn();
    const { onConfirm } = renderConfirmation({ failure: "conflict", onRefresh });

    expect(screen.getByRole("alert")).toHaveTextContent(/programa dejó de estar activo/i);
    await user.click(screen.getByRole("button", { name: "Actualizar actividad" }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("should block the confirmation while it is not allowed anymore", () => {
    renderConfirmation({ isAllowed: false });

    expect(screen.getByRole("button", { name: "Confirmar cancelación" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(/ya no está disponible/i);
  });

  it("should block duplicate submissions while pending", async () => {
    const user = setupUser();
    const { onConfirm } = renderConfirmation({ isSubmitting: true });

    const confirm = screen.getByRole("button", { name: "Confirmando..." });
    expect(confirm).toBeDisabled();
    expect(screen.getByRole("button", { name: "Volver sin cambios" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Volver sin cambios" }));

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("should describe the publish and unpublish outcomes", () => {
    const { unmount } = renderWithProviders(
      <ActivityLifecycleConfirmation
        action="publish"
        activityName="Datos abiertos"
        failure={null}
        isSubmitting={false}
        onConfirm={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(screen.getByText(/quedará disponible en la agenda pública/i)).toBeInTheDocument();
    unmount();

    renderWithProviders(
      <ActivityLifecycleConfirmation
        action="unpublish"
        activityName="Datos abiertos"
        failure={null}
        isSubmitting={false}
        onConfirm={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(screen.getByText(/volverá a borrador/i)).toBeInTheDocument();
  });

  it("should keep the reason after a failure", async () => {
    const user = setupUser();
    const { rerender } = renderWithProviders(
      <ActivityLifecycleConfirmation
        action="cancel"
        activityName="Taller de datos"
        failure={null}
        isSubmitting={false}
        onConfirm={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );
    const reason = screen.getByRole("textbox", { name: "Motivo de cancelación — opcional" });
    await user.type(reason, "Motivo conservado");

    rerender(
      <ActivityLifecycleConfirmation
        action="cancel"
        activityName="Taller de datos"
        failure="conflict"
        isSubmitting={false}
        onConfirm={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(
      within(screen.getByRole("form", { name: 'Cancelar actividad "Taller de datos"' })).getByRole(
        "textbox",
        { name: "Motivo de cancelación — opcional" },
      ),
    ).toHaveValue("Motivo conservado");
  });

  it("should present the delete variant without a reason field", () => {
    renderConfirmation({ action: "delete", activityName: "Taller de datos" });

    expect(
      screen.getByRole("form", { name: 'Eliminar borrador "Taller de datos"' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/se eliminará de forma permanente/i)).toBeInTheDocument();
    expect(screen.getByText(/el servidor verificará esta condición/i)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar borrador" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Volver sin cambios" })).toBeInTheDocument();
  });

  it("should submit the delete as an empty request", async () => {
    const user = setupUser();
    const { onConfirm } = renderConfirmation({ action: "delete" });

    await user.click(screen.getByRole("button", { name: "Eliminar borrador" }));

    expect(onConfirm).toHaveBeenCalledWith({});
  });

  it("should preserve the delete button name while submitting", () => {
    renderConfirmation({ action: "delete", isSubmitting: true });

    expect(screen.getByRole("button", { name: "Eliminar borrador" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Volver sin cambios" })).toBeDisabled();
  });

  it.each<[ActivityMutationFailure, RegExp]>([
    ["conflict", /registros de asistencia o alertas que deben conservarse/i],
    ["forbidden", /No tiene permisos vigentes para eliminar esta actividad/i],
    ["notFound", /La actividad ya no existe o dejó de estar disponible/i],
    ["invalidRequest", /No fue posible procesar la solicitud de eliminación/i],
    ["unknown", /No se pudo confirmar la eliminación/i],
  ])("should localize the delete failure %s", (failure, pattern) => {
    renderConfirmation({ action: "delete", failure });

    expect(screen.getByRole("alert")).toHaveTextContent(pattern);
  });

  it("should offer a refresh without resending after a delete failure", async () => {
    const user = setupUser();
    const onRefresh = vi.fn();
    const { onConfirm } = renderConfirmation({
      action: "delete",
      failure: "invalidRequest",
      onRefresh,
    });

    await user.click(screen.getByRole("button", { name: "Actualizar actividad" }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it.each(["cancel", "delete", "publish", "unpublish"] as const)(
    "should not offer a notification control in the %s confirmation",
    (action) => {
      renderConfirmation({ action, activityName: "Taller de datos" });

      expectNoNotificationControls(
        screen.getByRole("form", {
          name: `${confirmationLabelByAction[action]} "Taller de datos"`,
        }),
      );
    },
  );

  it("should not call the command when discarding the confirmation", async () => {
    const user = setupUser();
    const { onConfirm, onDiscard } = renderConfirmation();

    await user.click(screen.getByRole("button", { name: "Volver sin cambios" }));

    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it.each<ActivityMutationFailure>([
    "conflict",
    "forbidden",
    "notFound",
    "invalidRequest",
    "unknown",
  ])("should not attribute the %s failure to an email delivery", (failure) => {
    renderConfirmation({ failure });

    expect(screen.getByRole("alert").textContent).not.toMatch(EMAIL_ATTRIBUTION);
  });
});
