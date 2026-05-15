import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { smallEvents } from "@/data/sipeg";
import { LandingPage } from "@pages/LandingPage";
import { renderWithProviders } from "@/test/render";

function getEventTimestamp(event: (typeof smallEvents)[number]) {
  return new Date(`${event.date}T${event.startTime}:00`).getTime();
}

describe("LandingPage", () => {
  it("should show the most recent events first by default", () => {
    const [mostRecentEvent] = [...smallEvents].sort(
      (firstEvent, secondEvent) => getEventTimestamp(secondEvent) - getEventTimestamp(firstEvent),
    );

    renderWithProviders(<LandingPage />);

    expect(screen.getAllByRole("article")[0]).toHaveTextContent(mostRecentEvent?.name ?? "");
  });
});
