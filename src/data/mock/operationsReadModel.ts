import type { OperationsReadModel } from "@/types/domain";

import { attendanceRecords, certificates, reportMetrics, speakerProposals } from "./operations";
import { users } from "./users";

export const mockOperationsReadModel: OperationsReadModel = {
  attendanceRecords,
  certificates,
  reportMetrics,
  speakerProposals,
  users,
};
