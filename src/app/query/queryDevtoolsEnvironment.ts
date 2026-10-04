type QueryDevtoolsEnvironment = {
  readonly DEV?: boolean;
  readonly VITE_QUERY_DEVTOOLS?: string;
};

/**
 * Vive aparte del componente porque `react-refresh` solo admite exportaciones de componentes: al
 * estar en el mismo archivo que `QueryDevtools`, la exportacion de esta funcion se|reportaba en
 * consola y `eslint --max-warnings=0` rechazaba la rama.
 */
export function resolveQueryDevtools(
  environment: QueryDevtoolsEnvironment = import.meta.env,
): boolean {
  return environment.DEV === true && environment.VITE_QUERY_DEVTOOLS?.trim().toLowerCase() === "on";
}
