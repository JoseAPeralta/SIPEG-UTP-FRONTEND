import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { createPublicActivityDetail } from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import { setupUser } from "@/test/user";
import { formatActivityDate } from "@/utils/dateFormatting";

import { PublicActivityDetailView } from "./PublicActivityDetailView";

type GetPublicActivity = AppAdapters["publicActivityCatalog"]["getPublicActivity"];

function detailAdapters(getPublicActivity: GetPublicActivity): AppAdapters {
  const adapters = createAppAdapters({ source: "mock" });

  return {
    ...adapters,
    publicActivityCatalog: { ...adapters.publicActivityCatalog, getPublicActivity },
  };
}

function renderDetail(getPublicActivity: GetPublicActivity, activityId = "activity-7") {
  renderWithProviders(<PublicActivityDetailView activityId={activityId} />, {
    adapters: detailAdapters(getPublicActivity),
  });
}

describe("PublicActivityDetailView", () => {
  it("should present every public field of the activity", async () => {
    const detail = createPublicActivityDetail({
      bannerUrl: "https://example.test/portada.jpg",
      cancelReason: null,
      capacity: 40,
      classroom: {
        building: "Edificio de Aulas",
        id: "classroom-1",
        name: "Auditorio Roberto Barraza",
      },
      date: "2026-10-14",
      description: "Descripción completa del taller de topografía con drones.",
      endTime: "12:00",
      enrolledCount: 12,
      id: "activity-7",
      name: "Taller de Topografía con Drones",
      program: {
        id: "program-fic",
        isDefault: false,
        label: "Semana de innovación",
        name: "Programa de Eventos - Facultad de Ingeniería Civil",
      },
      speakers: [
        { firstName: "Ricardo", id: "speaker-1", lastName: "Arosemena" },
        { firstName: "Luisa", id: "speaker-2", lastName: "Fernandez" },
      ],
      startTime: "09:00",
      status: "SCHEDULED",
      type: "WORKSHOP",
      unit: { backendId: "fic", name: "Facultad de Ingeniería Civil", type: "FACULTY" },
    });

    renderDetail(() => Promise.resolve(detail));

    const heading = await screen.findByRole("heading", {
      level: 1,
      name: /taller de topografía con drones/i,
    });

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(heading).toHaveTextContent("Programada");
    expect(screen.getByText("Programada")).toBeInTheDocument();
    expect(
      screen.getByText(`${formatActivityDate("2026-10-14")} · 09:00 - 12:00`),
    ).toBeInTheDocument();
    expect(screen.getByText("Taller")).toBeInTheDocument();
    expect(screen.getByText("Semana de innovación")).toBeInTheDocument();
    expect(screen.getByText("Facultad de Ingeniería Civil")).toBeInTheDocument();
    expect(
      screen.getByText("Descripción completa del taller de topografía con drones."),
    ).toBeInTheDocument();
    expect(screen.getByText("Ricardo Arosemena")).toBeInTheDocument();
    expect(screen.getByText("Luisa Fernandez")).toBeInTheDocument();
    expect(screen.getByText("Auditorio Roberto Barraza")).toBeInTheDocument();
    expect(screen.getByText("Edificio: Edificio de Aulas")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /cartel de la actividad taller de topografía con drones/i }),
    ).toHaveAttribute("src", "https://example.test/portada.jpg");

    const capacity = screen.getByRole("region", { name: "Capacidad" });

    expect(within(capacity).getByText("40")).toBeInTheDocument();
    expect(within(capacity).getByText("12")).toBeInTheDocument();
    expect(within(capacity).getByText("28")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a la agenda" })).toHaveAttribute("href", "/");
  });

  it("should clamp the available seats at zero", async () => {
    renderDetail(() =>
      Promise.resolve(createPublicActivityDetail({ capacity: 10, enrolledCount: 25 })),
    );

    const capacity = await screen.findByRole("region", { name: "Capacidad" });

    expect(within(capacity).getByText("10")).toBeInTheDocument();
    expect(within(capacity).getByText("25")).toBeInTheDocument();
    expect(within(capacity).getByText("0")).toBeInTheDocument();
  });

  it("should not invent seats when the capacity is unknown", async () => {
    renderDetail(() =>
      Promise.resolve(createPublicActivityDetail({ capacity: null, enrolledCount: 7 })),
    );

    expect(
      await screen.findByText("La capacidad de esta actividad no está informada."),
    ).toBeInTheDocument();

    const capacity = screen.getByRole("region", { name: "Capacidad" });

    expect(within(capacity).queryByText("Disponibles")).not.toBeInTheDocument();
    expect(within(capacity).queryByText("7")).not.toBeInTheDocument();
  });

  it("should warn about a cancellation with its reason", async () => {
    renderDetail(() =>
      Promise.resolve(
        createPublicActivityDetail({
          cancelReason: "Falta de cupo en el aula asignada.",
          status: "CANCELLED",
        }),
      ),
    );

    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent("Actividad cancelada");
    expect(alert).toHaveTextContent("Falta de cupo en el aula asignada.");
    expect(screen.getByText("Cancelada")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a la agenda" })).toHaveAttribute("href", "/");
  });

  it("should warn about a cancellation without a reason", async () => {
    renderDetail(() =>
      Promise.resolve(createPublicActivityDetail({ cancelReason: null, status: "CANCELLED" })),
    );

    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent("Actividad cancelada");
    expect(alert).toHaveTextContent(/el motivo de la cancelación no está informado/i);
  });

  it("should announce the load before the detail is available", () => {
    renderDetail(() => new Promise(() => undefined));

    expect(screen.getByText(/cargando informacion/i)).toBeInTheDocument();
    expect(screen.queryAllByRole("heading", { level: 1 })).toHaveLength(0);
  });

  it("should localize the failure and retry in place", async () => {
    const user = setupUser();
    const detail = createPublicActivityDetail({ id: "activity-7", name: "Actividad recuperada" });
    const getPublicActivity = vi
      .fn<GetPublicActivity>()
      .mockRejectedValueOnce(new Error("detalle interno del backend"))
      .mockResolvedValueOnce(detail);

    renderDetail(getPublicActivity);

    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent(/no se pudo cargar la informacion/i);
    expect(alert).not.toHaveTextContent(/detalle interno/i);

    await user.click(screen.getByRole("button", { name: /reintentar/i }));

    expect(
      await screen.findByRole("heading", { level: 1, name: /actividad recuperada/i }),
    ).toBeInTheDocument();
    expect(getPublicActivity).toHaveBeenCalledTimes(2);
  });

  it("should present an unavailable activity with a way back", async () => {
    renderDetail(() => Promise.resolve(null));

    expect(await screen.findByText("Actividad no disponible")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a la agenda" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("button", { name: /reintentar/i })).not.toBeInTheDocument();
    expect(screen.queryAllByRole("heading", { level: 1 })).toHaveLength(0);
  });

  it("should omit the optional sections that are absent", async () => {
    renderDetail(() =>
      Promise.resolve(
        createPublicActivityDetail({
          bannerUrl: null,
          classroom: null,
          description: null,
          id: "activity-7",
          speakers: [],
        }),
      ),
    );

    await screen.findByRole("heading", { level: 1, name: /actividad activity-7/i });

    expect(screen.queryByRole("heading", { name: "Descripción" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Expositores" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Aula" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Capacidad" })).toBeInTheDocument();
  });
});
