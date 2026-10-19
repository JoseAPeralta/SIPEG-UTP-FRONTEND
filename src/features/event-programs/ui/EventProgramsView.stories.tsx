import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, waitFor, within } from "storybook/test";

import { useSessionStore } from "@/store/session";
import { useWorkingContextStore } from "@/store/workingContext";
import { EventProgramsStoryProviders } from "@/test/EventProgramsStoryProviders";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";

import { EventProgramsView } from "./EventProgramsView";

const meta = {
  component: EventProgramsView,
  decorators: [
    (Story, context) => (
      <EventProgramsStoryProviders key={context.id}>
        <Story />
      </EventProgramsStoryProviders>
    ),
  ],
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  title: "Features/Event Programs/EventProgramsView",
} satisfies Meta<typeof EventProgramsView>;

export default meta;
type Story = StoryObj<typeof meta>;

function authenticateAdministrator() {
  useWorkingContextStore.getState().clearWorkingContext();
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole: "ADMIN" }),
    tokens: createAuthTokens(),
  });
}

export const Default: Story = {
  beforeEach: authenticateAdministrator,
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("heading", { level: 1, name: "Programas" })).toBeVisible();
    await expect(await canvas.findByText("Taller de Gobernanza de Datos Abiertos")).toBeVisible();
    await expect(canvas.getByText("Competencia de Robotica 2024")).toBeVisible();
    await expect(canvas.getAllByText("Agenda permanente").length).toBeGreaterThan(0);
  },
};

export const FilteringByStatus: Story = {
  beforeEach: authenticateAdministrator,
  parameters: {
    docs: {
      description: {
        story: "El estado elegido viaja al backend y el listado solo conserva los borradores.",
      },
    },
  },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByText("Taller de Gobernanza de Datos Abiertos");

    await userEvent.selectOptions(canvas.getByRole("combobox", { name: "Estado" }), "DRAFT");

    await expect(await canvas.findByText("Taller de Gobernanza de Datos Abiertos")).toBeVisible();
    await waitFor(() => expect(canvas.queryByText("Competencia de Robotica 2024")).toBeNull());
  },
};

export const SearchingPrograms: Story = {
  beforeEach: authenticateAdministrator,
  parameters: {
    docs: {
      description: {
        story: "La busqueda por nombre o etiqueta se envia al backend al confirmar.",
      },
    },
  },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByText("Semana de Innovacion Academica");

    await userEvent.type(canvas.getByRole("textbox", { name: "Buscar programas" }), "robotica");
    await userEvent.click(canvas.getByRole("button", { name: "Buscar" }));

    await expect(await canvas.findByText("Competencia de Robotica 2024")).toBeVisible();
    await waitFor(() => expect(canvas.queryByText("Semana de Innovacion Academica")).toBeNull());
  },
};

export const CreatingProgram: Story = {
  beforeEach: authenticateAdministrator,
  parameters: {
    docs: {
      description: {
        story:
          "El alta captura nombre, unidad, fechas y etiqueta; el programa nace como borrador y la confirmacion explica que puede quedar fuera de los filtros actuales.",
      },
    },
  },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByText("Semana de Innovacion Academica");

    await userEvent.click(canvas.getByRole("button", { name: "Nuevo programa" }));
    const form = canvas.getByRole("form", { name: "Nuevo programa" });
    await userEvent.type(
      within(form).getByRole("textbox", { name: "Nombre" }),
      "Jornada de Egresados",
    );
    await userEvent.selectOptions(within(form).getByRole("combobox", { name: "Unidad" }), "fisc");
    await fireEvent.change(within(form).getByLabelText("Fecha inicial"), {
      target: { value: "2026-12-18" },
    });
    await fireEvent.change(within(form).getByLabelText("Fecha final"), {
      target: { value: "2026-12-20" },
    });
    await userEvent.click(within(form).getByRole("button", { name: "Crear programa" }));

    await expect(await canvas.findByRole("status")).toHaveTextContent(/creó como borrador/i);
    await expect(await canvas.findByText("Jornada de Egresados")).toBeVisible();
  },
};

export const EditingProgram: Story = {
  beforeEach: authenticateAdministrator,
  parameters: {
    docs: {
      description: {
        story:
          "La edicion precarga los campos del registro del listado, omite la unidad propietaria y guarda con la allowlist del contrato.",
      },
    },
  },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByText("Semana de Innovacion Academica");
    const card = canvas.getByRole("article", { name: "Cumbre de Energia y Redes Inteligentes" });

    await userEvent.click(within(card).getByRole("button", { name: "Editar" }));
    const form = canvas.getByRole("form", { name: "Editar programa" });
    await expect(within(form).getByLabelText("Unidad")).toBeDisabled();
    await userEvent.clear(within(form).getByRole("textbox", { name: "Nombre" }));
    await userEvent.type(
      within(form).getByRole("textbox", { name: "Nombre" }),
      "Cumbre de Energia y Redes renovadas",
    );
    await userEvent.click(within(form).getByRole("button", { name: "Guardar cambios" }));

    await expect(await canvas.findByText(/se guardaron/i)).toBeVisible();
    await expect(await canvas.findByText("Cumbre de Energia y Redes renovadas")).toBeVisible();
  },
};

export const ArchivingProgram: Story = {
  beforeEach: authenticateAdministrator,
  parameters: {
    docs: {
      description: {
        story:
          "El archivo exige una confirmacion explicita con el nombre del programa; nunca se ofrece borrado fisico.",
      },
    },
  },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByText("Semana de Innovacion Academica");
    const card = canvas.getByRole("article", { name: "Taller de Gobernanza de Datos Abiertos" });

    await userEvent.click(within(card).getByRole("button", { name: "Archivar" }));
    const confirmation = canvas.getByRole("group", {
      name: /confirmar archivo de taller de gobernanza de datos abiertos/i,
    });

    await expect(within(confirmation).getByText(/reactivarlo más adelante/i)).toBeVisible();
    await expect(canvas.queryByRole("button", { name: /eliminar/i })).toBeNull();
  },
};

export const PermanentAgenda: Story = {
  beforeEach: authenticateAdministrator,
  parameters: {
    docs: {
      description: {
        story:
          "La agenda permanente no muestra fechas, no ofrece archivo ni reactivacion directa y dirige su ciclo de vida a la unidad propietaria.",
      },
    },
  },
  play: async ({ canvas }) => {
    const card = await canvas.findByRole("article", {
      name: "Programa de Eventos de Ingenieria Civil",
    });

    await expect(within(card).queryByRole("button", { name: "Archivar" })).toBeNull();
    await expect(within(card).queryByRole("button", { name: "Reactivar" })).toBeNull();
    await expect(within(card).getByText(/su ciclo de vida lo controla la unidad/i)).toBeVisible();
    await expect(within(card).getByRole("link", { name: "Gestionar unidad" })).toHaveAttribute(
      "href",
      "/admin/unidades/fic",
    );
  },
};

export const ManagingCollaborators: Story = {
  beforeEach: authenticateAdministrator,
  parameters: {
    docs: {
      description: {
        story:
          "El panel consulta y gestiona los colaboradores del programa seleccionado sin salir del listado; el foco regresa al boton al cerrarlo.",
      },
    },
  },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByText("Semana de Innovacion Academica");
    const card = canvas.getByRole("article", { name: "Semana de Innovacion Academica" });

    await userEvent.click(within(card).getByRole("button", { name: "Colaboradores" }));

    await expect(
      await canvas.findByRole("heading", {
        level: 2,
        name: "Colaboradores de Semana de Innovacion Academica",
      }),
    ).toBeVisible();
    await expect(canvas.getByText("Estado del programa: Activo")).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "Cerrar colaboradores" }));

    await expect(canvas.queryByRole("heading", { level: 2, name: /colaboradores de/i })).toBeNull();
    await expect(within(card).getByRole("button", { name: "Colaboradores" })).toHaveFocus();
  },
};

export const SelectingWorkingContext: Story = {
  beforeEach: authenticateAdministrator,
  parameters: {
    docs: {
      description: {
        story:
          "Cualquier programa legible, incluido un borrador o un archivado, se selecciona como contexto de trabajo; la tarjeta marca la seleccion vigente.",
      },
    },
  },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByText("Semana de Innovacion Academica");
    const card = canvas.getByRole("article", { name: "Semana de Innovacion Academica" });

    await userEvent.click(within(card).getByRole("button", { name: "Usar como contexto" }));

    await expect(within(card).getByText("Contexto seleccionado")).toBeVisible();
    await expect(within(card).getByRole("button", { name: "Usar como contexto" })).toBeDisabled();
  },
};

export const ArchivedCollaborators: Story = {
  beforeEach: authenticateAdministrator,
  parameters: {
    docs: {
      description: {
        story:
          "Un programa archivado conserva la consulta de sus colaboradores, pero no ofrece ninguna accion de modificacion.",
      },
    },
  },
  play: async ({ canvas, userEvent }) => {
    const card = await canvas.findByRole("article", { name: "Competencia de Robotica 2024" });

    await userEvent.click(within(card).getByRole("button", { name: "Colaboradores" }));

    await expect(
      await canvas.findByText(
        "El programa está archivado. Puede consultar sus colaboradores, pero no modificarlos.",
      ),
    ).toBeVisible();
    await expect(canvas.getByText("Estado del programa: Archivado")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Agregar colaborador" })).toBeNull();
  },
};

export const ConfirmingByKeyboard: Story = {
  beforeEach: authenticateAdministrator,
  parameters: {
    docs: {
      description: {
        story:
          "Archivar puede completarse solo con teclado: Enter abre la confirmacion y Enter confirma la accion.",
      },
    },
  },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByText("Semana de Innovacion Academica");
    const card = canvas.getByRole("article", { name: "Taller de Gobernanza de Datos Abiertos" });
    const archive = within(card).getByRole("button", { name: "Archivar" });

    archive.focus();
    await expect(archive).toHaveFocus();
    await userEvent.keyboard("{Enter}");

    const confirmation = canvas.getByRole("group", {
      name: /confirmar archivo de taller de gobernanza de datos abiertos/i,
    });
    const confirm = within(confirmation).getByRole("button", { name: "Confirmar archivo" });
    confirm.focus();
    await userEvent.keyboard("{Enter}");

    await expect(await canvas.findByText(/se archivó/i)).toBeVisible();
    const updated = canvas.getByRole("article", { name: "Taller de Gobernanza de Datos Abiertos" });
    await expect(within(updated).getByText("Archivado")).toBeVisible();
  },
};

export const ConflictRecovery: Story = {
  beforeEach: authenticateAdministrator,
  parameters: {
    docs: {
      description: {
        story:
          "Un archivo rechazado por actividades en curso conserva la confirmacion, explica el conflicto y ofrece actualizar el listado sin repetir la mutacion.",
      },
    },
  },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByText("Semana de Innovacion Academica");
    const card = canvas.getByRole("article", { name: "Semana de Innovacion Academica" });
    await userEvent.click(within(card).getByRole("button", { name: "Archivar" }));

    const confirmation = canvas.getByRole("group", {
      name: /confirmar archivo de semana de innovacion academica/i,
    });
    await userEvent.click(within(confirmation).getByRole("button", { name: "Confirmar archivo" }));

    await expect(await canvas.findByText(/actividades programadas o en curso/i)).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Actualizar listado" }));

    await expect(await canvas.findByText(/actividades programadas o en curso/i)).toBeVisible();
    await expect(
      within(confirmation).getByRole("button", { name: "Confirmar archivo" }),
    ).toBeVisible();
    await expect(within(card).getByText("Activo")).toBeVisible();
  },
};

export const LifecycleFlow: Story = {
  beforeEach: authenticateAdministrator,
  parameters: {
    docs: {
      description: {
        story:
          "Recorrido completo sobre un mismo programa: alta como borrador, publicacion, archivo y reactivacion contra el mock con estado compartido de la story.",
      },
    },
  },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByText("Semana de Innovacion Academica");

    await userEvent.click(canvas.getByRole("button", { name: "Nuevo programa" }));
    const form = canvas.getByRole("form", { name: "Nuevo programa" });
    await userEvent.type(
      within(form).getByRole("textbox", { name: "Nombre" }),
      "Jornada de Egresados",
    );
    await userEvent.selectOptions(within(form).getByRole("combobox", { name: "Unidad" }), "fic");
    await fireEvent.change(within(form).getByLabelText("Fecha inicial"), {
      target: { value: "2026-12-18" },
    });
    await fireEvent.change(within(form).getByLabelText("Fecha final"), {
      target: { value: "2026-12-20" },
    });
    await userEvent.click(within(form).getByRole("button", { name: "Crear programa" }));
    await expect(await canvas.findByText(/creó como borrador/i)).toBeVisible();

    let card = await canvas.findByRole("article", { name: "Jornada de Egresados" });
    await expect(within(card).getByText("Borrador")).toBeVisible();

    await userEvent.click(within(card).getByRole("button", { name: "Publicar" }));
    await userEvent.click(canvas.getByRole("button", { name: "Confirmar publicación" }));
    await expect(await canvas.findByText(/quedó activo/i)).toBeVisible();

    card = await canvas.findByRole("article", { name: "Jornada de Egresados" });
    await userEvent.click(within(card).getByRole("button", { name: "Archivar" }));
    await userEvent.click(canvas.getByRole("button", { name: "Confirmar archivo" }));
    await expect(await canvas.findByText(/se archivó/i)).toBeVisible();

    card = await canvas.findByRole("article", { name: "Jornada de Egresados" });
    await userEvent.click(within(card).getByRole("button", { name: "Reactivar" }));
    await userEvent.click(canvas.getByRole("button", { name: "Confirmar reactivación" }));
    await expect(await canvas.findByText(/se reactivó/i)).toBeVisible();

    card = canvas.getByRole("article", { name: "Jornada de Egresados" });
    await expect(within(card).getByRole("button", { name: "Editar" })).toBeVisible();
    await expect(within(card).getByRole("button", { name: "Archivar" })).toBeVisible();
  },
};
