export function toError(error: unknown, fallbackMessage = "No se pudo completar la operacion") {
  return error instanceof Error ? error : new Error(fallbackMessage);
}
