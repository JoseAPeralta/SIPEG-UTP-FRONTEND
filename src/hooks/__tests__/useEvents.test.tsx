import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { useEvents, type FetchEvents } from "@hooks/useEvents";

function UseEventsProbe({ fetchEvents }: { fetchEvents: FetchEvents }) {
  const { error, isLoading, largeEvents, refetch, smallEvents } = useEvents(fetchEvents);

  return (
    <div>
      <p>{isLoading ? "Cargando" : "Listo"}</p>
      <p>Grandes: {largeEvents.length}</p>
      <p>Pequenos: {smallEvents.length}</p>
      {error ? <p role="alert">{error.message}</p> : null}
      <button onClick={refetch} type="button">
        Recargar
      </button>
    </div>
  );
}

describe("useEvents", () => {
  it("should expose loading and event data when the service succeeds", async () => {
    const fetchEvents = vi.fn().mockResolvedValue({
      largeEvents: [{ id: "large-event" }],
      smallEvents: [{ id: "small-event" }, { id: "small-event-2" }],
    });

    render(<UseEventsProbe fetchEvents={fetchEvents as FetchEvents} />);

    expect(screen.getByText("Cargando")).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText("Listo")).toBeInTheDocument());

    expect(screen.getByText("Grandes: 1")).toBeInTheDocument();
    expect(screen.getByText("Pequenos: 2")).toBeInTheDocument();
  });

  it("should expose errors when the service fails", async () => {
    const fetchEvents = vi.fn().mockRejectedValue(new Error("API no disponible"));

    render(<UseEventsProbe fetchEvents={fetchEvents as FetchEvents} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("API no disponible");
    expect(screen.getByText("Listo")).toBeInTheDocument();
  });

  it("should refetch event data on demand", async () => {
    const user = userEvent.setup();
    const fetchEvents = vi
      .fn()
      .mockResolvedValueOnce({ largeEvents: [], smallEvents: [] })
      .mockResolvedValueOnce({ largeEvents: [{ id: "large-event" }], smallEvents: [] });

    render(<UseEventsProbe fetchEvents={fetchEvents as FetchEvents} />);

    await waitFor(() => expect(fetchEvents).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole("button", { name: /recargar/i }));

    await waitFor(() => expect(fetchEvents).toHaveBeenCalledTimes(2));
    expect(screen.getByText("Grandes: 1")).toBeInTheDocument();
  });
});
