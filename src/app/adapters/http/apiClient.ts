export type ApiEnvironment = {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly VITE_API_BASE_URL?: string;
};

export type ApiClientOptions = {
  environment?: ApiEnvironment;
  fetcher?: typeof fetch;
};

export type ApiRequestAuth =
  { mode: "none" } | { accessToken: string | null | undefined; mode: "bearer" };

/**
 * Recupera un access token nuevo. Lo inyecta el modulo de sesion, de modo que
 * esta capa no conoce como se renueva la credencial ni como se coordina entre
 * pestanas.
 */
export type SessionRefresh = () => Promise<{ getAccessToken: () => string | null }>;

export type ApiRequestOptions = ApiClientOptions & {
  auth: ApiRequestAuth;
  requestInit?: RequestInit;
  sessionRefresh?: SessionRefresh;
};

const DEVELOPMENT_API_BASE_URL = "http://localhost:3000";

const STATUS_MESSAGES: Record<number, string> = {
  400: "La solicitud no es valida.",
  401: "Su sesion no esta autorizada.",
  403: "No tiene permisos para esta accion.",
  404: "No se encontro el recurso solicitado.",
  409: "La operacion entra en conflicto con el estado actual.",
  422: "Los datos enviados no son validos.",
};

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function messageForStatus(status: number) {
  const message = STATUS_MESSAGES[status];

  if (message) {
    return message;
  }

  return status >= 500
    ? "Ocurrio un error en el servidor. Intente de nuevo."
    : "No se pudo completar la solicitud.";
}

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

export function resolveApiBaseUrl(environment: ApiEnvironment = import.meta.env) {
  const configuredBaseUrl = environment.VITE_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, "");
  }

  if (environment.DEV) {
    return DEVELOPMENT_API_BASE_URL;
  }

  throw new Error("VITE_API_BASE_URL es obligatoria en produccion");
}

/**
 * Rutas donde un 401 significa "tu sesion termino" y no "este token se quedo
 * viejo". Refrescarlas otra vez seria un bucle: el propio refresh devuelve 401
 * cuando la sesion ya no existe.
 */
const NON_REFRESHABLE_PATHS = new Set(["/api/v1/auth/refresh", "/api/v1/auth/login"]);

async function send(
  requestUrl: string,
  {
    auth,
    environment,
    fetcher,
    requestInit,
    accessTokenOverride,
  }: {
    auth: ApiRequestAuth;
    environment: ApiEnvironment;
    fetcher: typeof fetch;
    requestInit: RequestInit | undefined;
    accessTokenOverride?: string;
  },
): Promise<unknown> {
  void environment;
  const headers = new Headers(requestInit?.headers);

  if (headers.has("Authorization")) {
    throw new ApiError("La cabecera Authorization se administra internamente.", 400);
  }

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const accessToken =
    accessTokenOverride ?? (auth.mode === "bearer" ? auth.accessToken?.trim() : undefined);

  if (auth.mode === "bearer" || accessTokenOverride !== undefined) {
    if (!accessToken) {
      throw new ApiError(messageForStatus(401), 401);
    }
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let response: Response;

  try {
    response = await fetcher(requestUrl, {
      ...requestInit,
      headers,
      // La sesion viaja en una cookie HttpOnly: sin esto el navegador no la
      // adjuntaria a una peticion entre orígenes, y cada pestana seria anonima.
      credentials: "include",
    });
  } catch {
    throw new ApiError(
      "No se pudo conectar con el servidor. Verifique que el backend este disponible.",
      0,
    );
  }

  if (!response.ok) {
    throw new ApiError(messageForStatus(response.status), response.status);
  }

  if (response.status === 204) {
    return undefined;
  }

  return response.json();
}

export async function apiRequest<TResponse>(
  path: string,
  {
    auth,
    environment = import.meta.env,
    fetcher = fetch,
    requestInit,
    sessionRefresh,
  }: ApiRequestOptions,
): Promise<TResponse> {
  const normalizedPath = normalizePath(path);
  const requestUrl = `${resolveApiBaseUrl(environment)}${normalizedPath}`;

  try {
    return (await send(requestUrl, { auth, environment, fetcher, requestInit })) as TResponse;
  } catch (error) {
    const canRecover =
      sessionRefresh !== undefined &&
      error instanceof ApiError &&
      error.status === 401 &&
      auth.mode === "bearer" &&
      !NON_REFRESHABLE_PATHS.has(normalizedPath);

    if (!canRecover) {
      throw error;
    }

    // Un solo reintento. Si el token nuevo tambien falla, el 401 sube al
    // llamador: repetirlo mas veces solo gastaria cuota de rotacion.
    let renewed: string | null;
    try {
      renewed = (await sessionRefresh()).getAccessToken();
    } catch {
      throw new ApiError(messageForStatus(401), 401);
    }

    if (!renewed) {
      throw new ApiError(messageForStatus(401), 401);
    }

    return (await send(requestUrl, {
      auth,
      environment,
      fetcher,
      requestInit,
      accessTokenOverride: renewed,
    })) as TResponse;
  }
}
