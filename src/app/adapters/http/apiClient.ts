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

export type ApiRequestOptions = ApiClientOptions & {
  auth: ApiRequestAuth;
  requestInit?: RequestInit;
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

export async function apiRequest<TResponse>(
  path: string,
  { auth, environment = import.meta.env, fetcher = fetch, requestInit }: ApiRequestOptions,
) {
  const normalizedPath = normalizePath(path);
  const requestUrl = `${resolveApiBaseUrl(environment)}${normalizedPath}`;
  const headers = new Headers(requestInit?.headers);

  if (headers.has("Authorization")) {
    throw new ApiError("La cabecera Authorization se administra internamente.", 400);
  }

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (auth.mode === "bearer") {
    const accessToken = auth.accessToken?.trim();

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
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}
