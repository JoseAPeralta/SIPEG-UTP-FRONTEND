import { FeedbackState } from "@/components";

/**
 * Certificates section of the personal area. It mirrors the pending activities section and will be
 * filled in by phase 10 with the list of personal certificates and their private download. It
 * renders no control while the download contract does not exist.
 */
export function PersonalCertificatesPage() {
  return (
    <FeedbackState
      description="SIPEG todavía no publica el servicio de certificados. Cuando lo haga, aquí podrá consultar y descargar los certificados de las actividades en las que su asistencia fue confirmada."
      role="status"
      title="Próximamente"
    />
  );
}

export default PersonalCertificatesPage;
