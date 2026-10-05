import { screen } from "@testing-library/react";
import { setupUser } from "@/test/user";
import { describe, expect, it, vi } from "vitest";

import { createActivity, createEventProgram, createOrganizationalUnit } from "@/test/factories";
import { renderWithProviders } from "@/test/render";

import type { ProgramSummary } from "../model/catalogSelectors";
import { EventProgramCard } from "./EventProgramCard";

const unit = createOrganizationalUnit({ code: "FISC" });

function createSummary(overrides: Partial<ProgramSummary> = {}): ProgramSummary {
  return {
    activityCount: 3,
    enrolledCount: 120,
    program: createEventProgram({ label: "Semana de innovacion" }),
    unit,
    ...overrides,
  };
}

describe("EventProgramCard", () => {
  it("should show the date range, activity count and attendee total", () => {
    renderWithProviders(<EventProgramCard summary={createSummary()} />);

    expect(screen.getByText(/3/)).toBeInTheDocument();
    expect(screen.getByText(/120/)).toBeInTheDocument();
    expect(screen.getByText(/15/)).toBeInTheDocument();
    expect(screen.getByText("Semana de innovacion")).toBeInTheDocument();
    expect(screen.queryByText("FISC")).not.toBeInTheDocument();
  });

  it("should show the unit name for default programs without a label", () => {
    renderWithProviders(
      <EventProgramCard
        summary={createSummary({
          program: createEventProgram({
            isDefault: true,
            label: null,
            name: "Programa de Eventos - Facultad de Ingenieria de Sistemas Computacionales",
          }),
        })}
      />,
    );

    expect(screen.getByText("Facultad de Ingenieria Civil", { exact: true })).toBeInTheDocument();
  });

  it("should label default programs without dates", () => {
    renderWithProviders(
      <EventProgramCard
        summary={createSummary({
          program: createEventProgram({ endDate: null, isDefault: true, startDate: null }),
        })}
      />,
    );

    expect(screen.getByText(/programa predeterminado/i)).toBeInTheDocument();
    expect(screen.getByText(/agenda permanente/i)).toBeInTheDocument();
  });

  it("should report the selected program", async () => {
    const user = setupUser();
    const onSelect = vi.fn();
    const summary = createSummary();

    renderWithProviders(<EventProgramCard onSelect={onSelect} summary={summary} />);

    await user.click(
      screen.getByRole("button", {
        name: new RegExp(`usar ${summary.program.name} en panel`, "i"),
      }),
    );

    expect(onSelect).toHaveBeenCalledWith(summary.program);
  });

  it("should keep the summary count independent from activities", () => {
    renderWithProviders(
      <EventProgramCard summary={createSummary({ activityCount: 0, enrolledCount: 0 })} />,
    );

    expect(screen.getByText(/agenda permanente|15/i)).toBeInTheDocument();
    expect(createActivity({}).id).toBe("activity-1");
  });
});
