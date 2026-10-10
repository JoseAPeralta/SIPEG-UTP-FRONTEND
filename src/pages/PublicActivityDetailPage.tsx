import { useParams } from "react-router";

import { PublicActivityDetailView } from "@/features/activity-catalog/public";

/**
 * La ruta entrega el identificador a la vista para que el componente siga siendo presentacional y
 * se pueda montar en pruebas sin un router de parametrizacion.
 */
export function PublicActivityDetailPage() {
  const { activityId = "" } = useParams();

  return <PublicActivityDetailView activityId={activityId} />;
}

export default PublicActivityDetailPage;
