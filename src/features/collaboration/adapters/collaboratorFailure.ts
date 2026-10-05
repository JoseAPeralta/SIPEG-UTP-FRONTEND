function statusOf(error: unknown): unknown {
  return typeof error === "object" && error !== null && "status" in error
    ? error.status
    : undefined;
}

/**
 * `403` expresa autorización insuficiente, no una sesión inválida: la UI debe releer sus permisos
 * antes de apagar acciones y nunca cerrar la sesión por sí sola.
 */
export function isForbiddenCollaboratorError(error: unknown): boolean {
  return statusOf(error) === 403;
}

export function collaboratorFailureMessage(
  error: unknown,
  operation: "add" | "change" | "remove" | "grant" | "revoke",
): string {
  const status = statusOf(error);
  if (status === 401) return "Su sesión ya no está autorizada. Vuelva a iniciar sesión.";
  if (status === 403 && operation === "grant")
    return "No tiene autorización para otorgar ese permiso. Solo puede delegar permisos que posee y dentro de su propia vigencia.";
  if (status === 403 && operation === "revoke")
    return "No tiene autorización para revocar ese permiso. Solo puede retirar permisos que posee.";
  if (status === 403)
    return "No tiene autorización para delegar esos permisos o modificar esta colaboración. Revise sus permisos y vuelva a consultar.";
  if (status === 400 && (operation === "grant" || operation === "revoke"))
    return "Revise el permiso y el periodo de vigencia; la persona debe seguir siendo colaboradora del contexto.";
  if (status === 400) return "Revise el identificador de la persona y el rol seleccionado.";
  if (status === 404 && (operation === "grant" || operation === "revoke"))
    return "La persona o la colaboración ya no están disponibles. Actualice la lista.";
  if (status === 404)
    return "La persona, la colaboración o el contexto ya no están disponibles. Actualice la lista.";
  if (status === 409 && operation === "remove")
    return "No se pudo retirar la colaboración. El contexto debe conservar una persona capaz de delegar y el programa debe permitir cambios. Actualice la lista antes de reintentar.";
  if (status === 409 && operation === "revoke")
    return "No se pudo revocar el permiso. Puede estar heredado del programa, revocarlo allí, o dejar al contexto sin una persona capaz de delegar. Actualice la lista y revise el caso.";
  if (status === 409 && operation === "grant")
    return "La concesión entra en conflicto con el estado actual. Puede superar su propia vigencia o pertenecer a un programa archivado. Actualice la lista y revise el periodo.";
  if (status === 409)
    return "La colaboración entra en conflicto con el estado actual. Puede existir ya, faltar una persona capaz de delegar o pertenecer a un programa archivado. Actualice la lista y revise el cambio.";
  return "No se pudo completar el cambio. Se conservaron los datos para que pueda reintentar.";
}
