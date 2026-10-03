import { describe, expect, it } from "vitest";

import { mapClassroom, mapClassroomsPage } from "./classroomsMapper";

const classroom = {
  amenities: ["projector"],
  building: null,
  capacity: 40,
  floor: null,
  id: "classroom-1",
  isActive: true,
  name: "Aula 101",
  type: "CLASSROOM",
};

describe("classroomsMapper", () => {
  it("should map nullable location and amenities", () => {
    expect(mapClassroom(classroom)).toEqual(classroom);
  });

  it("should validate the complete paginated response", () => {
    expect(
      mapClassroomsPage({
        data: { items: [classroom], limit: 50, page: 1, total: 1, totalPages: 1 },
        message: "ok",
        success: true,
      }),
    ).toEqual({ items: [classroom], totalPages: 1 });
  });

  it("should reject values outside the contract", () => {
    expect(() => mapClassroom({ ...classroom, type: "AUDITORIUM" })).toThrow(/type/);
    expect(() => mapClassroom({ ...classroom, building: undefined })).toThrow(/building/);
  });
});
