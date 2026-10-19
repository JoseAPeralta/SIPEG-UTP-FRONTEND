import { Button, Stack } from "@chakra-ui/react";
import { screen, waitFor } from "@testing-library/react";
import { setupUser } from "@/test/user";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters } from "@/app/adapters";
import { createQueryClient } from "@/app/query";
import { useSessionStore } from "@/store/session";
import {
  createAuthenticatedUser,
  createAuthTokens,
  createClassroom,
  createClassroomDetail,
} from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import type { Classroom } from "@/types/domain";

import { useClassroomMutations } from "../hooks/useClassroomMutations";
import type { AvailableClassroomsCriteria } from "../model/availableClassrooms";
import {
  ClassroomAvailabilitySelector,
  type ClassroomSelection,
} from "./ClassroomAvailabilitySelector";

const criteria = { date: "2026-08-24", endTime: "11:00", startTime: "09:00" };

type RenderSelectorOptions = {
  assignedClassroom?: { id: string; name: string } | null;
  loadAvailableClassrooms?: (criteria: AvailableClassroomsCriteria) => Promise<Classroom[]>;
  onSelectionChange?: (selection: ClassroomSelection | null) => void;
  selected?: ClassroomSelection | null;
  selectorCriteria?: AvailableClassroomsCriteria;
};

function renderSelector({
  assignedClassroom = null,
  loadAvailableClassrooms = vi.fn().mockResolvedValue([createClassroom()]),
  onSelectionChange = vi.fn(),
  selected = null,
  selectorCriteria = criteria,
}: RenderSelectorOptions = {}) {
  const adapters = createAppAdapters({ source: "mock" });
  adapters.classrooms = { ...adapters.classrooms, loadAvailableClassrooms };

  return {
    adapters,
    loadAvailableClassrooms,
    onSelectionChange,
    ...renderWithProviders(
      <ClassroomAvailabilitySelector
        assignedClassroom={assignedClassroom}
        criteria={selectorCriteria}
        onSelectionChange={onSelectionChange}
        selected={selected}
      />,
      { adapters },
    ),
  };
}

describe("ClassroomAvailabilitySelector", () => {
  it("should wait for a valid explicit request before loading classrooms", () => {
    const invalidCriteria = { ...criteria, endTime: "09:00" };
    const { loadAvailableClassrooms } = renderSelector({ selectorCriteria: invalidCriteria });

    expect(screen.getByRole("button", { name: "Consultar aulas" })).toBeDisabled();
    expect(loadAvailableClassrooms).not.toHaveBeenCalled();
  });

  it("should list only returned classrooms and notify the controlled selection", async () => {
    const user = setupUser();
    const classroom = createClassroom();
    const onSelectionChange = vi.fn();
    const { loadAvailableClassrooms } = renderSelector({
      loadAvailableClassrooms: vi.fn().mockResolvedValue([classroom]),
      onSelectionChange,
    });

    await user.click(screen.getByRole("button", { name: "Consultar aulas" }));

    await waitFor(() => expect(loadAvailableClassrooms).toHaveBeenCalledWith(criteria));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Aula disponible" }),
      classroom.id,
    );

    expect(onSelectionChange).toHaveBeenCalledWith({
      id: classroom.id,
      label: "Aula 101 · Aula · 60 personas · Proyector",
    });
  });

  it("should explain a rejected availability request without exposing its backend message", async () => {
    const user = setupUser();
    const { loadAvailableClassrooms } = renderSelector({
      loadAvailableClassrooms: vi
        .fn()
        .mockRejectedValue(Object.assign(new Error("detalle interno"), { status: 400 })),
    });

    await user.click(screen.getByRole("button", { name: "Consultar aulas" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Revise la fecha, el horario y la capacidad antes de consultar las aulas.",
    );
    expect(screen.queryByText("detalle interno")).not.toBeInTheDocument();
    expect(loadAvailableClassrooms).toHaveBeenCalledTimes(1);
  });

  it("should preserve a selected classroom that becomes unavailable after a new search", async () => {
    const user = setupUser();
    const classroom = createClassroom();
    const loadAvailableClassrooms = vi
      .fn()
      .mockResolvedValueOnce([classroom])
      .mockResolvedValueOnce([]);
    const rendered = renderSelector({
      loadAvailableClassrooms,
      selected: { id: classroom.id, label: "Aula 101" },
    });

    await user.click(screen.getByRole("button", { name: "Consultar aulas" }));
    await screen.findByRole("option", { name: /aula 101/i });

    rendered.rerender(
      <ClassroomAvailabilitySelector
        criteria={{ ...criteria, endTime: "12:00" }}
        onSelectionChange={vi.fn()}
        selected={{ id: classroom.id, label: "Aula 101" }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Consultar aulas" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El aula seleccionada ya no está disponible para estos criterios.",
    );
    expect(screen.getByRole("option", { name: /aula 101.*no disponible/i })).toBeDisabled();
  });

  it("should keep the assigned classroom selectable without claiming a conflict", async () => {
    const user = setupUser();
    const onSelectionChange = vi.fn();
    const assigned = { id: "aula-10", name: "Aula 10B" };

    renderSelector({
      assignedClassroom: assigned,
      loadAvailableClassrooms: vi.fn().mockResolvedValue([]),
      onSelectionChange,
      selected: { id: assigned.id, label: "Aula 10B · Aula asignada; se validará al guardar" },
    });

    await user.click(screen.getByRole("button", { name: "Consultar aulas" }));
    await screen.findByText("No hay aulas disponibles para estos criterios");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /aula 10b.*asignada; se validará al guardar/i }),
    ).not.toBeDisabled();

    await user.selectOptions(screen.getByRole("combobox", { name: "Aula disponible" }), "");
    expect(onSelectionChange).toHaveBeenCalledWith(null);
  });

  it("should mark results as outdated when the criteria change and still allow clearing", async () => {
    const user = setupUser();
    const classroom = createClassroom();
    const onSelectionChange = vi.fn();
    const loadAvailableClassrooms = vi.fn().mockResolvedValue([classroom]);
    const rendered = renderSelector({
      loadAvailableClassrooms,
      onSelectionChange,
      selected: { id: classroom.id, label: "Aula 101" },
    });

    await user.click(screen.getByRole("button", { name: "Consultar aulas" }));
    await screen.findByRole("option", { name: /aula 101/i });

    rendered.rerender(
      <ClassroomAvailabilitySelector
        criteria={{ ...criteria, endTime: "12:00" }}
        onSelectionChange={onSelectionChange}
        selected={{ id: classroom.id, label: "Aula 101" }}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Los criterios cambiaron");
    expect(screen.getByRole("option", { name: /aula 101/i })).toBeDisabled();

    await user.selectOptions(screen.getByRole("combobox", { name: "Aula disponible" }), "");
    expect(onSelectionChange).toHaveBeenCalledWith(null);

    await user.click(screen.getByRole("button", { name: "Consultar aulas" }));
    await waitFor(() =>
      expect(loadAvailableClassrooms).toHaveBeenLastCalledWith({ ...criteria, endTime: "12:00" }),
    );
  });

  it("should mark the selection as unavailable when a mutation removes it from availability", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "ADMIN", id: "admin-1" }),
      tokens: createAuthTokens(),
    });

    const user = setupUser();
    const classroom = createClassroom();
    const loadAvailableClassrooms = vi
      .fn()
      .mockResolvedValueOnce([classroom])
      .mockResolvedValue([]);
    const updateClassroom = vi.fn().mockResolvedValue(createClassroomDetail());

    const adapters = createAppAdapters({ source: "mock" });
    adapters.classrooms = { ...adapters.classrooms, loadAvailableClassrooms, updateClassroom };
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });

    function Harness() {
      const mutations = useClassroomMutations();
      const [selected, setSelected] = useState<ClassroomSelection | null>({
        id: classroom.id,
        label: "Aula 101",
      });

      return (
        <Stack>
          <ClassroomAvailabilitySelector
            criteria={criteria}
            onSelectionChange={setSelected}
            selected={selected}
          />
          <Button
            onClick={() => void mutations.update("classroom-1", { isActive: false })}
            type="button"
          >
            Retirar aula
          </Button>
        </Stack>
      );
    }

    renderWithProviders(<Harness />, { adapters, queryClient });

    await user.click(screen.getByRole("button", { name: "Consultar aulas" }));
    await screen.findByRole("option", { name: /aula 101/i });

    await user.click(screen.getByRole("button", { name: "Retirar aula" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "El aula seleccionada ya no está disponible para estos criterios.",
      ),
    );
    expect(loadAvailableClassrooms).toHaveBeenCalledTimes(2);
  });

  afterEach(() => {
    useSessionStore.setState({ currentUser: null, tokens: null });
  });
});
