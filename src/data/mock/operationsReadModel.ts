import type { OperationsReadModel } from "@/types/domain";

import { attendanceRecords, certificates, reportMetrics, speakerProposals } from "./operations";

export const mockOperationsReadModel: OperationsReadModel = {
  attendanceRecords,
  certificates,
  reportMetrics,
  speakerProposals,
};
