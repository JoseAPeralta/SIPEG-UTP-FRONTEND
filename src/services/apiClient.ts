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

  const response = await fetcher(requestUrl, {
    ...requestInit,
    headers,
  });

  if (!response.ok) {
    throw new Error(`No se pudo completar la solicitud a ${normalizedPath} (${response.status})`);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}
