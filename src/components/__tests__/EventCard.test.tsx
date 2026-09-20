import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it } from "vitest";

import { EventCard } from "@components/EventCard";
import { renderWithProviders } from "@/test/render";
import type { Classroom, Faculty, SmallEvent } from "@/types/domain";

const baseEvent: SmallEvent = {
  banner: "event.jpg",
  classroomId: "auditorium-01",
  collaboratorIds: [],
  date: "2026-06-15",
  description:
    "Una jornada aplicada sobre analitica academica, automatizacion de asistencia, emision de certificados y coordinacion operativa entre facultades para eventos institucionales de alta demanda.",
  endTime: "11:30",
  equipment: ["Proyector", "Audio"],
  facultyId: "fisc",
  id: "small-smart-campus",
  inheritedPermissionIds: [],
  name: "Campus inteligente y datos abiertos",
  permissionIds: [],
  registeredAttendees: 180,
  speakers: [
    {
      name: "Dra. Elena Vargas",
      organization: "Centro de Innovacion UTP",
    },
  ],
  startTime: "09:00",
  type: "conference",
};

const classroom: Classroom = {
  amenities: ["projector"],
  availableDays: ["Lunes"],
  availableHours: "08:00 - 17:00",
  capacity: 120,
  id: "auditorium-01",
  name: "Auditorio Central",
  type: "classroom",
};

const faculty: Faculty = {
  id: "fisc",
  name: "Facultad de Ingenieria de Sistemas Computacionales",
  shortName: "FISC",
};

function renderEventCard(props: Partial<ComponentProps<typeof EventCard>> = {}) {
  const {
    classroom: providedClassroom,
    event: providedEvent,
    faculty: providedFaculty,
    ...restProps
  } = props;
  const nextClassroom = "classroom" in props ? providedClassroom : classroom;
  const nextFaculty = "faculty" in props ? providedFaculty : faculty;

  return renderWithProviders(
    <EventCard
      classroom={nextClassroom}
      event={providedEvent ?? baseEvent}
      faculty={nextFaculty}
      {...restProps}
    />,
  );
}

describe("EventCard", () => {
  it("should show event description with an option to read more when it is long", async () => {
    const user = userEvent.setup();

    renderEventCard();

    expect(screen.getByText(/una jornada aplicada/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /leer mas/i }));

    expect(screen.getByText(/eventos institucionales de alta demanda/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /leer menos/i })).toBeInTheDocument();
  });

  it("should show start time, end time, place, faculty and speaker organizations", () => {
    renderEventCard({
      event: {
        ...baseEvent,
        speakers: [
          ...baseEvent.speakers,
          {
            name: "Ing. Marcos Lee",
            organization: "Autoridad Nacional para la Innovacion Gubernamental",
          },
        ],
      },
    });

    expect(screen.getByText(/15 jun 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/09:00 - 11:30/i)).toBeInTheDocument();
    expect(screen.getByText(/auditorio central/i)).toBeInTheDocument();
    expect(screen.getByText(/fisc/i)).toBeInTheDocument();
    expect(screen.getByText(/dra\. elena vargas/i)).toBeInTheDocument();
    expect(screen.getByText(/centro de innovacion utp/i)).toBeInTheDocument();
    expect(screen.getByText(/ing\. marcos lee/i)).toBeInTheDocument();
    expect(screen.getByText(/autoridad nacional/i)).toBeInTheDocument();
  });

  it("should hide dashboard-only details by default", () => {
    renderEventCard();

    expect(screen.queryByText(/asistentes/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/equipo/i)).not.toBeInTheDocument();
  });

  it("should show attendees and equipment only for dashboard cards", () => {
    renderEventCard({ showDashboardDetails: true });

    expect(screen.getByText(/asistentes/i)).toBeInTheDocument();
    expect(screen.getByText("180")).toBeInTheDocument();
    expect(screen.getByText(/equipo/i)).toBeInTheDocument();
    expect(screen.getByText(/proyector, audio/i)).toBeInTheDocument();
  });

  it("should hide faculty when the faculty prop is not provided", () => {
    renderEventCard({ faculty: undefined });

    expect(screen.queryByText(/fisc/i)).not.toBeInTheDocument();
  });
});
