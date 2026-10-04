import { useParams } from "react-router";

import { ClassroomDetailView } from "@/features/classrooms";

/**
 * La ruta entrega el identificador a la vista para que el componente siga siendo presentacional y
 * se pueda montar en pruebas sin un router de parametrizacion.
 */
export function ClassroomDetailPage() {
  const { classroomId = "" } = useParams();

  return <ClassroomDetailView classroomId={classroomId} />;
}

export default ClassroomDetailPage;
