import { describe, expect, it } from "vitest";

import { mockActivityCatalog, mockOperationsReadModel } from "./catalog";
import { careers } from "./careers";

const { activities, classrooms, eventPrograms, organizationalUnits } = mockActivityCatalog;
const { attendanceRecords, certificates, speakerProposals, users } = mockOperationsReadModel;

describe("mock activity catalog", () => {
  it("should keep every activity attached to an existing event program", () => {
    const programIds = new Set(eventPrograms.map((program) => program.id));

    expect(activities.length).toBeGreaterThan(0);
    expect(activities.every((activity) => programIds.has(activity.eventProgramId))).toBe(true);
  });

  it("should attach every event program to an existing organizational unit", () => {
    const unitIds = new Set(organizationalUnits.map((unit) => unit.id));

    expect(eventPrograms.length).toBeGreaterThan(0);
    expect(eventPrograms.every((program) => unitIds.has(program.organizationalUnitId))).toBe(true);
  });

  it("should give every organizational unit at least one event program", () => {
    expect(
      organizationalUnits.every((unit) =>
        eventPrograms.some((program) => program.organizationalUnitId === unit.id),
      ),
    ).toBe(true);
  });

  it("should omit dates on default programs and require them on additional programs", () => {
    eventPrograms
      .filter((program) => program.isDefault)
      .forEach((program) => {
        expect(program.startDate).toBeNull();
        expect(program.endDate).toBeNull();
      });

    eventPrograms
      .filter((program) => !program.isDefault)
      .forEach((program) => {
        expect(program.startDate).not.toBeNull();
        expect(program.endDate).not.toBeNull();
      });
  });

  it("should reference existing classrooms from every activity", () => {
    const classroomIds = new Set(classrooms.map((classroom) => classroom.id));

    activities.forEach((activity) => {
      if (activity.classroomId !== null) {
        expect(classroomIds.has(activity.classroomId)).toBe(true);
      }
    });
  });

  it("should use only activity types allowed by the API contract", () => {
    const allowedTypes = new Set([
      "WORKSHOP",
      "SEMINAR",
      "TALK",
      "CONFERENCE",
      "PANEL",
      "COURSE",
      "COMPETITION",
      "OTHER",
    ]);

    activities.forEach((activity) => {
      expect(allowedTypes.has(activity.type)).toBe(true);
    });
  });

  it("should keep unique identifiers across catalog collections", () => {
    const activityIds = activities.map((activity) => activity.id);
    const programIds = eventPrograms.map((program) => program.id);
    const unitIds = organizationalUnits.map((unit) => unit.id);

    expect(new Set(activityIds).size).toBe(activityIds.length);
    expect(new Set(programIds).size).toBe(programIds.length);
    expect(new Set(unitIds).size).toBe(unitIds.length);
  });

  it("should keep operational records pointing at catalog entities", () => {
    const activityIds = new Set(activities.map((activity) => activity.id));
    const programIds = new Set(eventPrograms.map((program) => program.id));
    const userIds = new Set(users.map((user) => user.id));

    attendanceRecords.forEach((record) => {
      expect(activityIds.has(record.activityId)).toBe(true);
      expect(userIds.has(record.userId)).toBe(true);
    });

    certificates.forEach((certificate) => {
      expect(activityIds.has(certificate.activityId)).toBe(true);
      expect(userIds.has(certificate.userId)).toBe(true);
    });

    speakerProposals.forEach((proposal) => {
      expect(programIds.has(proposal.eventProgramId)).toBe(true);
    });
  });

  it("should attach every career to an existing unit or keep it global", () => {
    const unitIds = new Set(organizationalUnits.map((unit) => unit.id));

    expect(careers.length).toBeGreaterThan(0);
    expect(careers.some((career) => career.unitId === null)).toBe(true);
    expect(careers.every((career) => career.unitId === null || unitIds.has(career.unitId))).toBe(
      true,
    );
  });

  it("should point every user at existing careers and units", () => {
    const careerIds = new Set(careers.map((career) => career.id));
    const unitIds = new Set(organizationalUnits.map((unit) => unit.id));

    users.forEach((user) => {
      if (user.careerId !== null) expect(careerIds.has(user.careerId)).toBe(true);
      if (user.unitId !== null) expect(unitIds.has(user.unitId)).toBe(true);
    });
  });

  it("should keep a single attendance code per registration", () => {
    const codes = attendanceRecords.map((record) => record.code);

    expect(new Set(codes).size).toBe(codes.length);
  });
});
