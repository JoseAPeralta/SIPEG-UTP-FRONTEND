import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";

import { AsyncStateView } from "./AsyncStateView";

describe("AsyncStateView", () => {
  it("should announce loading state", () => {
    renderWithProviders(
      <AsyncStateView error={null} isLoading>
        <p>contenido</p>
      </AsyncStateView>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(/cargando informacion/i);
    expect(screen.queryByText("contenido")).not.toBeInTheDocument();
  });

  it("should announce the error and retry", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    renderWithProviders(
      <AsyncStateView error={new Error("sin conexion")} isLoading={false} onRetry={onRetry}>
        <p>contenido</p>
      </AsyncStateView>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/sin conexion/i);

    await user.click(screen.getByRole("button", { name: /reintentar/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("should render children when data is ready", () => {
    renderWithProviders(
      <AsyncStateView error={null} isLoading={false}>
        <p>contenido</p>
      </AsyncStateView>,
    );

    expect(screen.getByText("contenido")).toBeInTheDocument();
  });
});
