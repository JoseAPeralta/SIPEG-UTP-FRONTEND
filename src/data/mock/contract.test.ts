import { describe, expect, it } from "vitest";

import { mockActivityCatalog, mockOperationsReadModel } from "./catalog";

const activityTypes = [
  "WORKSHOP",
  "SEMINAR",
  "TALK",
  "CONFERENCE",
  "PANEL",
  "COURSE",
  "COMPETITION",
  "OTHER",
];
const activityStatuses = ["DRAFT", "SCHEDULED", "ONGOING", "COMPLETED", "CANCELLED"];
const eventProgramStatuses = ["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED", "ARCHIVED"];
const organizationalUnitTypes = ["FACULTY", "SUBDIRECTORATE"];
const classroomTypes = ["LABORATORY", "CLASSROOM"];
const globalRoles = ["ADMIN", "USER"];
const attendanceMethods = ["QR", "MANUAL"];
const certificateStatuses = ["GENERATED", "PENDING"];
const reportTrends = ["down", "stable", "up"];

const { activities, classrooms, eventPrograms, organizationalUnits } = mockActivityCatalog;
const { attendanceRecords, careers, certificates, reportMetrics, speakerProposals, users } =
  mockOperationsReadModel;

function expectNonEmptyText(values: readonly string[], label: string) {
  values.forEach((value) => {
    expect(value.trim(), `${label} no debe estar vacio`).not.toBe("");
  });
}

describe("mock contract vocabulary", () => {
  it("should use only activity types and statuses allowed by the API contract", () => {
    activities.forEach((activity) => {
      expect(activityTypes).toContain(activity.type);
      expect(activityStatuses).toContain(activity.status);
    });
    speakerProposals.forEach((proposal) => {
      expect(activityTypes).toContain(proposal.talkType);
    });
  });

  it("should use only event program, unit and classroom types allowed by the contract", () => {
    eventPrograms.forEach((program) => {
      expect(eventProgramStatuses).toContain(program.status);
    });
    organizationalUnits.forEach((unit) => {
      expect(organizationalUnitTypes).toContain(unit.type);
    });
    classrooms.forEach((classroom) => {
      expect(classroomTypes).toContain(classroom.type);
    });
  });

  it("should use only operations values allowed by the contract", () => {
    users.forEach((user) => {
      expect(globalRoles).toContain(user.globalRole);
    });
    attendanceRecords.forEach((record) => {
      expect(attendanceMethods).toContain(record.method);
    });
    certificates.forEach((certificate) => {
      expect(certificateStatuses).toContain(certificate.status);
    });
    reportMetrics.forEach((metric) => {
      expect(reportTrends).toContain(metric.trend);
    });
  });
});

describe("mock required fields", () => {
  it("should keep catalog identifiers, names and codes non-empty", () => {
    expectNonEmptyText(
      activities.map((activity) => activity.id),
      "activity.id",
    );
    expectNonEmptyText(
      activities.map((activity) => activity.name),
      "activity.name",
    );
    expectNonEmptyText(
      activities.map((activity) => `${activity.date}T${activity.startTime}`),
      "activity.date",
    );
    expectNonEmptyText(
      eventPrograms.map((program) => program.id),
      "eventProgram.id",
    );
    expectNonEmptyText(
      eventPrograms.map((program) => program.name),
      "eventProgram.name",
    );
    expectNonEmptyText(
      organizationalUnits.map((unit) => unit.id),
      "organizationalUnit.id",
    );
    expectNonEmptyText(
      organizationalUnits.map((unit) => unit.code),
      "organizationalUnit.code",
    );
    expectNonEmptyText(
      classrooms.map((classroom) => classroom.id),
      "classroom.id",
    );
    expectNonEmptyText(
      classrooms.map((classroom) => classroom.name),
      "classroom.name",
    );
  });

  it("should keep operational identifiers and people data non-empty", () => {
    expectNonEmptyText(
      users.map((user) => user.id),
      "user.id",
    );
    expectNonEmptyText(
      users.map((user) => user.email),
      "user.email",
    );
    expectNonEmptyText(
      users.map((user) => user.firstName),
      "user.firstName",
    );
    expectNonEmptyText(
      careers.map((career) => career.id),
      "career.id",
    );
    expectNonEmptyText(
      careers.map((career) => career.code),
      "career.code",
    );
    expectNonEmptyText(
      attendanceRecords.map((record) => record.code),
      "attendanceRecord.code",
    );
    expectNonEmptyText(
      certificates.map((certificate) => certificate.generatedAt),
      "certificate.generatedAt",
    );
    expectNonEmptyText(
      speakerProposals.map((proposal) => proposal.proposalTitle),
      "speakerProposal.proposalTitle",
    );
    expectNonEmptyText(
      reportMetrics.map((metric) => metric.value),
      "reportMetric.value",
    );
  });

  it("should keep non-negative attendance counters", () => {
    activities.forEach((activity) => {
      expect(activity.enrolledCount).toBeGreaterThanOrEqual(0);
      expect(activity.checkedInCount).toBeGreaterThanOrEqual(0);
    });
    classrooms.forEach((classroom) => {
      expect(classroom.capacity).toBeGreaterThanOrEqual(0);
    });
  });
});
