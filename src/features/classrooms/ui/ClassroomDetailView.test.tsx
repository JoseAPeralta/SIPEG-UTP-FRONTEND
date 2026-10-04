import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { createAppAdapters } from "@/app/adapters";
import type { AppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import {
  createAuthenticatedUser,
  createClassroom,
  createClassroomAvailability,
  createClassroomDetail,
} from "@/test/factories";
import { renderWithProviders } from "@/test/render";

import { ClassroomDetailView } from "./ClassroomDetailView";

function renderDetail(configure?: (adapters: AppAdapters) => void, classroomId = "aula-10") {
  useSessionStore.setState({ currentUser: createAuthenticatedUser({ id: "admin-1" }) });
  const adapters = createAppAdapters({ source: "mock" });
  adapters.classrooms.getClassroom = () =>
    Promise.resolve(
      createClassroomDetail({
        id: classroomId,
        name: "Aula 10B",
        availability: [
          createClassroomAvailability({
            dayOfWeek: 4,
            endTime: "10:00",
            id: "av-thu",
            startTime: "08:00",
          }),
          createClassroomAvailability({
            dayOfWeek: 1,
            endTime: "09:00",
            id: "av-mon-1",
            startTime: "07:00",
          }),
          createClassroomAvailability({
            dayOfWeek: 1,
            endTime: "12:00",
            id: "av-mon-2",
            period: "Tarde",
            startTime: "10:00",
          }),
        ],
      }),
    );
  configure?.(adapters);

  return {
    adapters,
    ...renderWithProviders(<ClassroomDetailView classroomId={classroomId} />, { adapters }),
  };
}

describe("ClassroomDetailView", () => {
  it("presents the classroom and its weekly availability from Monday to Sunday", async () => {
    renderDetail();

    expect(await screen.findByRole("heading", { level: 1, name: "Aula 10B" })).toBeVisible();

    const days = within(screen.getByRole("region", { name: /disponibilidad semanal/i }))
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);

    expect(days).toEqual(["Lunes", "Jueves"]);

    const monday = within(screen.getByRole("region", { name: "Lunes" })).getAllByRole("listitem");
    expect(monday.map((item) => item.textContent)).toEqual([
      expect.stringContaining("07:00"),
      expect.stringContaining("10:00"),
    ]);
    expect(monday[1]).toHaveTextContent("Tarde");
  });

  it("shows an empty state with a way back when the classroom no longer exists", async () => {
    renderDetail((adapters) => {
      adapters.classrooms.getClassroom = () =>
        Promise.reject(Object.assign(new Error("no existe"), { status: 404 }));
    });

    expect(
      await screen.findByText(/el aula solicitada ya no existe o fue retirada/i),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: /volver al listado de aulas/i })).toHaveAttribute(
      "href",
      "/admin/aulas",
    );
    expect(screen.queryByRole("button", { name: /reintentar/i })).not.toBeInTheDocument();
  });

  it("explains that a reserved classroom cannot be deactivated", async () => {
    const user = userEvent.setup();
    renderDetail((adapters) => {
      adapters.classrooms.updateClassroom = vi
        .fn()
        .mockRejectedValue(
          Object.assign(new Error("409 classroom_has_scheduled_activities"), { status: 409 }),
        );
    });

    await user.click(await screen.findByRole("button", { name: /desactivar aula/i }));

    expect(
      await screen.findByText(/reservada por actividades programadas o en curso/i),
    ).toBeVisible();
    expect(screen.queryByText(/classroom_has_scheduled_activities/)).not.toBeInTheDocument();
  });

  it("reactivates an inactive classroom", async () => {
    const user = userEvent.setup();
    const updateClassroom = vi.fn().mockResolvedValue(createClassroomDetail({ isActive: true }));
    renderDetail((adapters) => {
      adapters.classrooms.updateClassroom = updateClassroom;
      adapters.classrooms.getClassroom = () =>
        Promise.resolve(createClassroomDetail({ id: "aula-10", isActive: false }));
    });

    await user.click(await screen.findByRole("button", { name: /reactivar aula/i }));

    expect(updateClassroom).toHaveBeenCalledWith("aula-10", { isActive: true });
  });

  it("sends only the editable fields when saving the classroom data", async () => {
    const user = userEvent.setup();
    const updateClassroom = vi.fn().mockResolvedValue(createClassroomDetail());
    renderDetail((adapters) => {
      adapters.classrooms.updateClassroom = updateClassroom;
    });

    await screen.findByRole("heading", { level: 1, name: "Aula 10B" });
    await user.clear(screen.getByRole("textbox", { name: "Nombre" }));
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Aula 10C");
    await user.clear(screen.getByRole("spinbutton", { name: "Capacidad" }));
    await user.type(screen.getByRole("spinbutton", { name: "Capacidad" }), "55");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(updateClassroom).toHaveBeenCalledWith("aula-10", {
      building: "Edificio de Aulas",
      capacity: 55,
      floor: 1,
      name: "Aula 10C",
      type: "CLASSROOM",
    });
  });

  it("adds and removes an amenity", async () => {
    const user = userEvent.setup();
    const addClassroomAmenity = vi.fn().mockResolvedValue(createClassroomDetail());
    const removeClassroomAmenity = vi.fn().mockResolvedValue(createClassroomDetail());
    renderDetail((adapters) => {
      adapters.classrooms.addClassroomAmenity = addClassroomAmenity;
      adapters.classrooms.removeClassroomAmenity = removeClassroomAmenity;
    });

    await screen.findByRole("heading", { level: 1, name: "Aula 10B" });
    await user.type(screen.getByRole("textbox", { name: "Nueva amenidad" }), "mesa-reglable");
    await user.click(screen.getByRole("button", { name: "Agregar amenidad" }));

    expect(addClassroomAmenity).toHaveBeenCalledWith("aula-10", "mesa-reglable");

    await user.click(screen.getByRole("button", { name: "Quitar Proyector" }));

    expect(removeClassroomAmenity).toHaveBeenCalledWith("aula-10", "projector");
  });

  it("explains a duplicated amenity", async () => {
    const user = userEvent.setup();
    renderDetail((adapters) => {
      adapters.classrooms.addClassroomAmenity = vi
        .fn()
        .mockRejectedValue(Object.assign(new Error("amenity already exists"), { status: 409 }));
    });

    await screen.findByRole("heading", { level: 1, name: "Aula 10B" });
    await user.type(screen.getByRole("textbox", { name: "Nueva amenidad" }), "proyector");
    await user.click(screen.getByRole("button", { name: "Agregar amenidad" }));

    expect(await screen.findByText(/esa amenidad ya est[aá] registrada/i)).toBeVisible();
    expect(screen.queryByText(/amenity already exists/)).not.toBeInTheDocument();
  });

  it("groups a new window under the ISO day that was selected", async () => {
    const user = userEvent.setup();
    const addClassroomAvailability = vi.fn().mockResolvedValue(createClassroomDetail());
    renderDetail((adapters) => {
      adapters.classrooms.addClassroomAvailability = addClassroomAvailability;
    });

    await screen.findByRole("heading", { level: 1, name: "Aula 10B" });
    await user.selectOptions(screen.getByRole("combobox", { name: "Dia" }), "5");
    await user.type(screen.getByRole("textbox", { name: "Hora de inicio" }), "09:00");
    await user.type(screen.getByRole("textbox", { name: "Hora de fin" }), "11:00");
    await user.type(screen.getByRole("textbox", { name: "Periodo" }), "Manana");
    await user.click(screen.getByRole("button", { name: "Agregar ventana" }));

    expect(addClassroomAvailability).toHaveBeenCalledWith("aula-10", {
      dayOfWeek: 5,
      endTime: "11:00",
      period: "Manana",
      startTime: "09:00",
    });
  });

  it("explains an overlapping weekly window without exposing the backend message", async () => {
    const user = userEvent.setup();
    renderDetail((adapters) => {
      adapters.classrooms.addClassroomAvailability = vi
        .fn()
        .mockRejectedValue(
          Object.assign(new Error("availability window overlaps"), { status: 409 }),
        );
    });

    await screen.findByRole("heading", { level: 1, name: "Aula 10B" });
    await user.selectOptions(screen.getByRole("combobox", { name: "Dia" }), "1");
    await user.type(screen.getByRole("textbox", { name: "Hora de inicio" }), "08:30");
    await user.type(screen.getByRole("textbox", { name: "Hora de fin" }), "11:00");
    await user.click(screen.getByRole("button", { name: "Agregar ventana" }));

    expect(await screen.findByText(/se solapa con una ventana ya registrada/i)).toBeVisible();
    expect(screen.queryByText(/availability window overlaps/)).not.toBeInTheDocument();
  });

  it("removes a weekly window by its own control", async () => {
    const user = userEvent.setup();
    const removeClassroomAvailability = vi.fn().mockResolvedValue(createClassroomDetail());
    renderDetail((adapters) => {
      adapters.classrooms.removeClassroomAvailability = removeClassroomAvailability;
    });

    await screen.findByRole("heading", { level: 1, name: "Aula 10B" });
    await user.click(
      screen.getByRole("button", { name: "Quitar ventana Jueves de 08:00 a 10:00" }),
    );

    expect(removeClassroomAvailability).toHaveBeenCalledWith("aula-10", "av-thu");
  });

  it("reports a classroom that disappeared while it was open", async () => {
    const user = userEvent.setup();
    renderDetail((adapters) => {
      adapters.classrooms.removeClassroomAmenity = vi
        .fn()
        .mockRejectedValue(Object.assign(new Error("not found"), { status: 404 }));
    });

    await screen.findByRole("heading", { level: 1, name: "Aula 10B" });
    await user.click(screen.getByRole("button", { name: "Quitar Proyector" }));

    expect(await screen.findByText(/ya no existe en el cat[aá]logo/i)).toBeVisible();
  });

  it("falls back to the raw name when the classroom has no building", async () => {
    renderDetail((adapters) => {
      adapters.classrooms.getClassroom = () =>
        Promise.resolve(
          createClassroomDetail({
            building: null,
            floor: null,
            id: "aula-10",
            name: "Aula 10B",
          }),
        );
    });

    await screen.findByRole("heading", { level: 1, name: "Aula 10B" });

    expect(screen.getByRole("spinbutton", { name: "Piso" })).toHaveValue(null);
  });

  it("offers the summary fields a classroom always has", async () => {
    renderDetail((adapters) => {
      adapters.classrooms.getClassroom = () =>
        Promise.resolve(
          createClassroomDetail({
            amenities: [],
            id: "aula-10",
            name: "Aula 10B",
            type: "LABORATORY",
          }),
        );
    });

    await screen.findByRole("heading", { level: 1, name: "Aula 10B" });

    expect(screen.getByRole("textbox", { name: "Tipo" })).toHaveValue("Laboratorio");
    expect(screen.getByText(/no tiene amenidades registradas/i)).toBeVisible();
    expect(createClassroom().capacity).toBe(60);
  });
});
