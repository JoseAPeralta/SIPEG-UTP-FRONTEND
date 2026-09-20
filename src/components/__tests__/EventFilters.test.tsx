import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { EventFilters } from "@components/EventFilters";
import { renderWithProviders } from "@/test/render";

type EventFiltersProps = ComponentProps<typeof EventFilters>;

function renderEventFilters(props: Partial<EventFiltersProps> = {}) {
  const onFacultyChange = vi.fn();
  const onEventTypeChange = vi.fn();
  const onSortDirectionChange = vi.fn();

  renderWithProviders(
    <EventFilters
      currentPage={1}
      eventTypeFilter="all"
      facultyFilter="all"
      filteredCount={24}
      onEventTypeChange={onEventTypeChange}
      onFacultyChange={onFacultyChange}
      onSortDirectionChange={onSortDirectionChange}
      sortDirection="asc"
      {...props}
    />,
  );

  return { onFacultyChange, onEventTypeChange, onSortDirectionChange };
}

describe("EventFilters", () => {
  it("should render the filter title and results count", () => {
    renderEventFilters({ filteredCount: 42 });

    expect(screen.getByText(/explorar agenda/i)).toBeInTheDocument();
    expect(screen.getByText(/filtra eventos disponibles/i)).toBeInTheDocument();
    expect(screen.getByText(/42 resultados/i)).toBeInTheDocument();
  });

  it("should render faculty filter options", async () => {
    const { onFacultyChange } = renderEventFilters();

    const facultySelect = screen.getByRole("combobox", { name: /facultad/i });
    await userEvent.selectOptions(facultySelect, "fisc");

    expect(onFacultyChange).toHaveBeenCalledWith("fisc");
  });

  it("should render event type filter options", async () => {
    const { onEventTypeChange } = renderEventFilters();

    const typeSelect = screen.getByRole("combobox", { name: /tipo de evento/i });
    await userEvent.selectOptions(typeSelect, "conference");

    expect(onEventTypeChange).toHaveBeenCalledWith("conference");
  });

  it("should render sort direction options with correct labels", () => {
    renderEventFilters();

    const sortSelect = screen.getByRole("combobox", { name: /orden/i });

    expect(sortSelect).toHaveTextContent(/ascendente/i);
    expect(sortSelect).toHaveTextContent(/descendente/i);
  });

  it("should call onSortDirectionChange when sort is changed", async () => {
    const { onSortDirectionChange } = renderEventFilters();

    const sortSelect = screen.getByRole("combobox", { name: /orden/i });
    await userEvent.selectOptions(sortSelect, "desc");

    expect(onSortDirectionChange).toHaveBeenCalledWith("desc");
  });

  it("should display all faculties from the data", () => {
    renderEventFilters();

    expect(screen.getByText(/todas las facultades/i)).toBeInTheDocument();
    expect(screen.getByText(/fic/i)).toBeInTheDocument();
    expect(screen.getByText(/fisc/i)).toBeInTheDocument();
    expect(screen.getByText(/fie/i)).toBeInTheDocument();
    expect(screen.getByText(/fim/i)).toBeInTheDocument();
  });

  it("should display all event types from the data", () => {
    renderEventFilters();

    expect(screen.getByText(/todos los tipos/i)).toBeInTheDocument();
    expect(screen.getByText(/conferencia/i)).toBeInTheDocument();
    expect(screen.getByText(/seminario/i)).toBeInTheDocument();
    expect(screen.getByText(/charla/i)).toBeInTheDocument();
    expect(screen.getByText(/taller/i)).toBeInTheDocument();
  });
});
