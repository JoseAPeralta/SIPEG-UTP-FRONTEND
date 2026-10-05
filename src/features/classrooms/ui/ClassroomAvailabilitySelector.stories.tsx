import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect } from "storybook/test";

import type { Classroom } from "@/types/domain";
import { createClassroom } from "@/test/factories";

import type { AvailableClassroomsCriteria } from "../model/availableClassrooms";
import { ClassroomAvailabilitySelector } from "./ClassroomAvailabilitySelector";

type SelectorStoryProps = {
  criteria: AvailableClassroomsCriteria;
  selectedClassroom?: Classroom | null;
};

function SelectorStory({ criteria, selectedClassroom = null }: SelectorStoryProps) {
  const [selected, setSelected] = useState(selectedClassroom);

  return (
    <ClassroomAvailabilitySelector
      criteria={criteria}
      onSelectionChange={setSelected}
      selectedClassroom={selected}
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
    selectedClassroom: createClassroom({
      amenities: ["tables", "whiteboard"],
      building: "Edificio de Aulas",
      capacity: 48,
      floor: 1,
      id: "aula-10",
      name: "Aula 10B",
      type: "CLASSROOM",
    }),
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Consultar aulas" }));

    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "El aula seleccionada ya no está disponible para estos criterios.",
    );
  },
};
