export type ApiEnvironment = {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly VITE_API_BASE_URL?: string;
};

export type ApiClientOptions = {
  environment?: ApiEnvironment;
  fetcher?: typeof fetch;
  requestInit?: RequestInit;
};

const DEVELOPMENT_API_BASE_URL = "http://localhost:3000/api";

const STATUS_MESSAGES: Record<number, string> = {
  400: "La solicitud no es valida.",
  401: "Tu sesion no esta autorizada.",
  403: "No tienes permisos para esta accion.",
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
    ? "Ocurrio un error en el servidor. Intenta de nuevo."
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
  { environment = import.meta.env, fetcher = fetch, requestInit }: ApiClientOptions = {},
) {
  const normalizedPath = normalizePath(path);
  const requestUrl = `${resolveApiBaseUrl(environment)}${normalizedPath}`;
  const headers = new Headers(requestInit?.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  let response: Response;

  try {
    response = await fetcher(requestUrl, {
      ...requestInit,
      headers,
    });
  } catch {
    throw new ApiError(
      "No se pudo conectar con el servidor. Verifica que el backend este disponible.",
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
