/**
 * Modo de acceso de la administracion de actividades.
 *
 * `administration` es el panel global `/admin`, reservado a `ADMIN` por el guard de ruta.
 * `operational` es el area de colaboradores: la lista de scopes descubierta decide las
 * capacidades y el backend conserva la autoridad final.
 */
export type ActivityAccessMode = "administration" | "operational";
