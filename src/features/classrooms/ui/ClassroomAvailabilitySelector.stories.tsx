import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect } from "storybook/test";

import type { AvailableClassroomsCriteria } from "../model/availableClassrooms";
import {
  ClassroomAvailabilitySelector,
  type ClassroomSelection,
} from "./ClassroomAvailabilitySelector";

type SelectorStoryProps = {
  assignedClassroom?: { id: string; name: string } | null;
  criteria: AvailableClassroomsCriteria;
  selected?: ClassroomSelection | null;
};

function SelectorStory({
  assignedClassroom = null,
  criteria,
  selected = null,
}: SelectorStoryProps) {
  const [selection, setSelection] = useState(selected);

  return (
    <ClassroomAvailabilitySelector
      assignedClassroom={assignedClassroom}
      criteria={criteria}
      onSelectionChange={setSelection}
      selected={selection}
    />
  );
}

const meta = {
  component: SelectorStory,
  parameters: {
    docs: {
      description: {
        component:
          "Selector controlado de aula para un formulario de actividades. La consulta solo inicia al pulsar el boton y el backend es quien determina la disponibilidad.",
      },
    },
  },
  tags: ["autodocs"],
  title: "Features/Classrooms/ClassroomAvailabilitySelector",
} satisfies Meta<typeof SelectorStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AvailableClassrooms: Story = {
  args: {
    criteria: { date: "2026-08-24", endTime: "09:00", startTime: "08:00" },
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Consultar aulas" }));

    await expect(await canvas.findByRole("combobox", { name: "Aula disponible" })).toBeVisible();
    await userEvent.selectOptions(
      canvas.getByRole("combobox", { name: "Aula disponible" }),
      "lab-01",
    );
    await expect(canvas.getByRole("combobox", { name: "Aula disponible" })).toHaveValue("lab-01");
  },
};

export const WithoutAvailableClassrooms: Story = {
  args: {
    criteria: { date: "2026-07-09", endTime: "09:30", startTime: "09:00" },
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Consultar aulas" }));

    await expect(
      await canvas.findByText("No hay aulas disponibles para estos criterios"),
    ).toBeVisible();
  },
};

export const SelectedClassroomUnavailable: Story = {
  args: {
    criteria: { date: "2026-07-09", endTime: "09:30", startTime: "09:00" },
    selected: { id: "aula-10", label: "Aula 10B · Aula · 48 personas · Mesas, Pizarra" },
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Consultar aulas" }));

    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "El aula seleccionada ya no está disponible para estos criterios.",
    );
  },
};

export const AssignedClassroomKept: Story = {
  args: {
    assignedClassroom: { id: "aula-10", name: "Aula 10B" },
    criteria: { date: "2026-07-09", endTime: "09:30", startTime: "09:00" },
    selected: { id: "aula-10", label: "Aula 10B · Aula asignada; se validará al guardar" },
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Consultar aulas" }));

    await expect(
      await canvas.findByText("No hay aulas disponibles para estos criterios"),
    ).toBeVisible();
    await expect(
      canvas.getByRole("option", { name: /aula 10b.*asignada; se validará al guardar/i }),
    ).toBeVisible();
    await expect(canvas.queryByRole("alert")).toBeNull();
  },
};
