import { describe, expect, it } from "vitest";

import type { SmallEvent } from "@/types/domain";
import { getEventsForFaculty } from "@utils/eventFilters";

const events: SmallEvent[] = [
  {
    banner: "banner-a.jpg",
    classroomId: "lab-01",
    collaboratorIds: ["user-1"],
    date: "2026-06-12",
    endTime: "11:00",
    equipment: ["Proyector"],
    facultyId: "fic",
    id: "event-a",
    inheritedPermissionIds: [],
    name: "Taller de datos",
    permissionIds: ["permission-1"],
    registeredAttendees: 50,
    speakers: [{ name: "Ana Perez", organization: "UTP" }],
    startTime: "09:00",
    type: "workshop",
  },
  {
    banner: "banner-b.jpg",
    classroomId: "aula-10",
    collaboratorIds: ["user-2"],
    date: "2026-05-18",
    endTime: "16:00",
    equipment: ["Pizarra"],
    facultyId: "fisc",
    id: "event-b",
    inheritedPermissionIds: [],
    name: "Seminario de redes",
    permissionIds: ["permission-2"],
    registeredAttendees: 85,
    speakers: [{ name: "Luis Diaz", organization: "UTP" }],
    startTime: "14:00",
    type: "seminar",
  },
];

describe("getEventsForFaculty", () => {
  it("should return every event when the faculty filter is all", () => {
    expect(getEventsForFaculty(events, "all")).toEqual(events);
  });

  it("should return only events for the selected faculty", () => {
    expect(getEventsForFaculty(events, "fic")).toEqual([events[0]]);
  });
});
