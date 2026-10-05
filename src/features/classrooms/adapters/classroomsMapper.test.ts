import { describe, expect, it } from "vitest";

import {
  mapClassroom,
  mapClassroomAvailability,
  mapClassroomDetail,
  mapClassroomDetailResponse,
  mapAvailableClassroomsResponse,
  mapClassroomsPage,
} from "./classroomsMapper";

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

const availabilityWindow = {
  dayOfWeek: 1,
  endTime: "10:00",
  id: "availability-1",
  period: "Mañana",
  startTime: "08:00",
};

const detail = { ...classroom, availability: [availabilityWindow] };

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

  it("should map a weekly availability window", () => {
    expect(mapClassroomAvailability(availabilityWindow)).toEqual(availabilityWindow);
  });

  it("should accept a window without period and reject a day outside ISO 1-7", () => {
    expect(mapClassroomAvailability({ ...availabilityWindow, period: null }).period).toBeNull();
    expect(() => mapClassroomAvailability({ ...availabilityWindow, dayOfWeek: 0 })).toThrow(
      /dayOfWeek/,
    );
    expect(() => mapClassroomAvailability({ ...availabilityWindow, dayOfWeek: 8 })).toThrow(
      /dayOfWeek/,
    );
  });

  it("should reject an institutional time outside HH:mm", () => {
    expect(() => mapClassroomAvailability({ ...availabilityWindow, startTime: "8:00" })).toThrow(
      /startTime/,
    );
    expect(() => mapClassroomAvailability({ ...availabilityWindow, endTime: "24:30" })).toThrow(
      /endTime/,
    );
  });

  it("should require the weekly availability in a detail", () => {
    expect(mapClassroomDetail(detail)).toEqual(detail);
    const withoutAvailability = { ...detail, availability: undefined };
    expect(() => mapClassroomDetail(withoutAvailability)).toThrow(/availability/);
  });

  it("should validate the command envelope that returns a detail", () => {
    expect(mapClassroomDetailResponse({ data: detail, message: "ok", success: true })).toEqual(
      detail,
    );
    expect(() =>
      mapClassroomDetailResponse({ data: detail, message: "ok", success: false }),
    ).toThrow(/success/);
    expect(() => mapClassroomDetailResponse({ data: detail, success: true })).toThrow(/message/);
  });

  it("should map the complete availability response without accepting a paginated payload", () => {
    expect(
      mapAvailableClassroomsResponse({ data: [classroom], message: "ok", success: true }),
    ).toEqual([classroom]);
    expect(() =>
      mapAvailableClassroomsResponse({
        data: { items: [classroom], limit: 50, page: 1, total: 1, totalPages: 1 },
        message: "ok",
        success: true,
      }),
    ).toThrow(/data/);
    expect(() =>
      mapAvailableClassroomsResponse({ data: [], message: "ok", success: false }),
    ).toThrow(/success/);
  });
});
