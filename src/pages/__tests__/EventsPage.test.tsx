import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { EventsPage } from "@pages/EventsPage";
import { largeEvents, smallEvents } from "@/data/sipeg";
import { useSelectedEventStore } from "@/store/selectedEvent";
import { renderWithProviders } from "@/test/render";

describe("EventsPage", () => {
  beforeEach(() => {
    useSelectedEventStore.getState().setSelectedEventId(null);
  });

  it("should summarize the agenda before listing events", () => {
    renderWithProviders(<EventsPage />);

    expect(screen.getByText(`${largeEvents.length} eventos grandes`)).toBeInTheDocument();
    expect(screen.getByText(`${smallEvents.length} eventos pequenos`)).toBeInTheDocument();
    expect(screen.getByText(/inscripciones acumuladas/i)).toBeInTheDocument();
    expect(screen.getByText(/facultades cubiertas/i)).toBeInTheDocument();
  });

  it("should filter small events by search text", async () => {
    const user = userEvent.setup();

    renderWithProviders(<EventsPage />);

    await user.type(screen.getByRole("textbox", { name: /buscar eventos/i }), "ciberseguridad");

    const catalog = within(screen.getByRole("region", { name: /catalogo de eventos pequenos/i }));

    expect(catalog.getByText(/ciberseguridad en servicios estudiantiles/i)).toBeInTheDocument();
    expect(catalog.queryByText(/campus inteligente y datos abiertos/i)).not.toBeInTheDocument();
  });

  it("should paginate the small event catalog", async () => {
    const user = userEvent.setup();

    renderWithProviders(<EventsPage />);

    expect(screen.getByText(/pagina 1 de/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /siguiente/i }));

    expect(screen.getByText(/pagina 2 de/i)).toBeInTheDocument();
  });

  it("should select a small event as the admin working event", async () => {
    const user = userEvent.setup();

    renderWithProviders(<EventsPage />);

    await user.type(screen.getByRole("textbox", { name: /buscar eventos/i }), "campus inteligente");
    await user.click(
      screen.getByRole("button", { name: /usar campus inteligente y datos abiertos en panel/i }),
    );

    expect(useSelectedEventStore.getState().selectedEventId).toBe("small-smart-campus");
    expect(screen.getByRole("status")).toHaveTextContent(/campus inteligente y datos abiertos/i);
  });
});
