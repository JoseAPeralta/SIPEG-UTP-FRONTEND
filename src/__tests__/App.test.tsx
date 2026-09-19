import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { App } from "@/App";
import { renderWithProviders } from "@/test/render";

describe("App", () => {
  it("should render the SIPEG dashboard on the index route", async () => {
    renderWithProviders(<App />);

    expect(
      await screen.findByRole("heading", { level: 1, name: /panel operativo sipeg/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /modulos principales/i })).toBeInTheDocument();
  });

  it("should navigate to the events page when the events module is selected", async () => {
    const user = userEvent.setup();

    renderWithProviders(<App />);

    await user.click(screen.getByRole("link", { name: /eventos/i }));

    expect(
      await screen.findByRole("heading", { level: 1, name: /eventos academicos/i }),
    ).toBeInTheDocument();
  });
});
