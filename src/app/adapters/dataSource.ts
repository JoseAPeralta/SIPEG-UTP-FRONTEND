export type DataSource = "mock" | "api";

export function resolveDataSource(
  environment: Record<string, unknown> = import.meta.env,
): DataSource {
  return environment["VITE_DATA_SOURCE"] === "mock" ? "mock" : "api";
}
