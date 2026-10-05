import type { Activity, AttendanceRecord, Certificate } from "@/types/domain";

export function filterAttendanceByScope(
  records: readonly AttendanceRecord[],
  activityIds: readonly string[],
): AttendanceRecord[] {
  const scopedActivityIds = new Set(activityIds);

  return records.filter((record) => scopedActivityIds.has(record.activityId));
}

export function filterCertificatesByScope(
  certificates: readonly Certificate[],
  activityIds: readonly string[],
): Certificate[] {
  const scopedActivityIds = new Set(activityIds);

  return certificates.filter((certificate) => scopedActivityIds.has(certificate.activityId));
}

export function countConfirmedAttendance(records: readonly AttendanceRecord[]): number {
  return records.filter((record) => record.present).length;
}

export function countQrAttendance(records: readonly AttendanceRecord[]): number {
  return records.filter((record) => record.method === "QR").length;
}

export function countGeneratedCertificates(certificates: readonly Certificate[]): number {
  return certificates.filter((certificate) => certificate.status === "GENERATED").length;
}

export function sumEnrolledCount(activities: readonly Activity[]): number {
  return activities.reduce((total, activity) => total + activity.enrolledCount, 0);
}
