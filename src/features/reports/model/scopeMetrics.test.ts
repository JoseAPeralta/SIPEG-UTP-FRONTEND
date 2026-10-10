// @vitest-environment node

import { describe, expect, it } from "vitest";

import { createAttendanceRecord, createCertificate } from "@/test/factories";

import {
  countConfirmedAttendance,
  countGeneratedCertificates,
  countQrAttendance,
  filterAttendanceByScope,
  filterCertificatesByScope,
} from "./scopeMetrics";

describe("filterAttendanceByScope", () => {
  it("should keep only records of the scoped activities", () => {
    const records = [
      createAttendanceRecord({ activityId: "activity-1", id: "attendance-1" }),
      createAttendanceRecord({ activityId: "activity-2", id: "attendance-2" }),
    ];

    expect(filterAttendanceByScope(records, ["activity-2"])).toEqual([records[1]]);
  });

  it("should return an empty list when there are no scoped activities", () => {
    expect(filterAttendanceByScope([createAttendanceRecord()], [])).toEqual([]);
  });
});

describe("filterCertificatesByScope", () => {
  it("should keep only certificates of the scoped activities", () => {
    const certificates = [
      createCertificate({ activityId: "activity-1", id: "certificate-1" }),
      createCertificate({ activityId: "activity-2", id: "certificate-2" }),
    ];

    expect(filterCertificatesByScope(certificates, ["activity-1"])).toEqual([certificates[0]]);
  });

  it("should return an empty list when there are no scoped activities", () => {
    expect(filterCertificatesByScope([createCertificate()], [])).toEqual([]);
  });
});

describe("countConfirmedAttendance", () => {
  it("should count only present records", () => {
    const records = [
      createAttendanceRecord({ id: "attendance-1", present: true }),
      createAttendanceRecord({ id: "attendance-2", present: false }),
      createAttendanceRecord({ id: "attendance-3", present: true }),
    ];

    expect(countConfirmedAttendance(records)).toBe(2);
  });

  it("should return zero for an empty list", () => {
    expect(countConfirmedAttendance([])).toBe(0);
  });
});

describe("countQrAttendance", () => {
  it("should count only records validated by QR", () => {
    const records = [
      createAttendanceRecord({ id: "attendance-1", method: "QR" }),
      createAttendanceRecord({ id: "attendance-2", method: "MANUAL" }),
      createAttendanceRecord({ id: "attendance-3", method: "QR" }),
    ];

    expect(countQrAttendance(records)).toBe(2);
  });
});

describe("countGeneratedCertificates", () => {
  it("should count only generated certificates", () => {
    const certificates = [
      createCertificate({ id: "certificate-1", status: "GENERATED" }),
      createCertificate({ id: "certificate-2", status: "PENDING" }),
    ];

    expect(countGeneratedCertificates(certificates)).toBe(1);
  });
});
