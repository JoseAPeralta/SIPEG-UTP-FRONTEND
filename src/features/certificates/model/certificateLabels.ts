import type { CertificateStatus } from "@/types/domain";

export const certificateStatusLabels: Record<CertificateStatus, string> = {
  GENERATED: "Generado",
  PENDING: "Pendiente",
};
