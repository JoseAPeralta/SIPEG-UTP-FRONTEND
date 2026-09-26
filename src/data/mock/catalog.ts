import type { ActivityCatalog, OperationsReadModel } from "@/types/domain";

import { activities } from "./activities";
import { classrooms } from "./classrooms";
import { eventPrograms } from "./eventPrograms";
import { attendanceRecords, certificates, reportMetrics, speakerProposals } from "./operations";
import { organizationalUnits } from "./organizationalUnits";
import { careers, users } from "./users";

export const mockActivityCatalog: ActivityCatalog = {
  activities,
  classrooms,
  eventPrograms,
  organizationalUnits,
};

export const mockOperationsReadModel: OperationsReadModel = {
  attendanceRecords,
  careers,
  certificates,
  reportMetrics,
  speakerProposals,
  users,
};
