import { attendanceRecords, certificates, classrooms, smallEvents } from "@/data/sipeg";
import { useFacultyPreferenceStore } from "@store/facultyPreference";
import { getEventsForFaculty } from "@utils/eventFilters";

export function useDashboardMetrics() {
  const selectedFacultyId = useFacultyPreferenceStore((state) => state.selectedFacultyId);
  const visibleEvents = getEventsForFaculty(smallEvents, selectedFacultyId);
  const visibleEventIds = new Set(visibleEvents.map((event) => event.id));
  const confirmedAttendance = attendanceRecords.filter(
    (record) => record.present && visibleEventIds.has(record.eventId),
  );
  const generatedCertificates = certificates.filter(
    (certificate) => certificate.status === "generated" && visibleEventIds.has(certificate.eventId),
  );
  const totalCapacity = classrooms.reduce((sum, classroom) => sum + classroom.capacity, 0);

  return {
    availableCapacity: totalCapacity,
    confirmedAttendance: confirmedAttendance.length,
    generatedCertificates: generatedCertificates.length,
    visibleEvents: visibleEvents.length,
  };
}
