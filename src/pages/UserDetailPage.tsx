import { useParams } from "react-router";

import { UserDetailView } from "@/features/users";

/**
 * La ruta entrega el identificador a la vista para que el componente siga siendo presentacional y
 * se pueda montar en pruebas sin un router de parametrizacion.
 */
export function UserDetailPage() {
  const { userId = "" } = useParams();

  return <UserDetailView userId={userId} />;
}

export default UserDetailPage;
