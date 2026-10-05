import { useParams } from "react-router";

import { OrganizationalUnitDetailView } from "@/features/organizational-units";

/** La ruta entrega el identificador para que la vista siga siendo presentacional y testeable. */
export function OrganizationalUnitDetailPage() {
  const { unitId = "" } = useParams();

  return <OrganizationalUnitDetailView unitId={unitId} />;
}

export default OrganizationalUnitDetailPage;
