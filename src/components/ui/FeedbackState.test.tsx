import { screen } from "@testing-library/react";
import { setupUser } from "@/test/user";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";

import { FeedbackState } from "./FeedbackState";

describe("FeedbackState", () => {
  it("should present the title as a section heading with its description", () => {
    renderWithProviders(
      <FeedbackState
        description="Cambie los filtros para ver resultados."
        title="No hay actividades"
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: /no hay actividades/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/cambie los filtros para ver resultados/i)).toBeInTheDocument();
  });

  it("should announce errors and offer the recovery action", async () => {
    const user = setupUser();
    const onRetry = vi.fn();

    renderWithProviders(
      <FeedbackState
        action={<button onClick={onRetry}>Reintentar</button>}
        description="sin conexion"
        role="alert"
        title="No se pudo cargar la informacion"
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/sin conexion/i);

    await user.click(screen.getByRole("button", { name: /reintentar/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("should announce a non-error outcome as a polite status", () => {
    renderWithProviders(
      <FeedbackState
        description="Revise su correo electronico para continuar."
        role="status"
        title="Solicitud registrada"
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(/revise su correo electr/i);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
