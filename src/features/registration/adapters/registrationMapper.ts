import type { RegistrationResult } from "@/types/domain";

export class RegistrationMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegistrationMappingError";
  }
}

function fail(context: string, detail: string): never {
  throw new RegistrationMappingError(`${context}: ${detail}`);
}

function readObject(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(context, "se esperaba un objeto");
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown, context: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(context, "se esperaba un texto no vacio");
  }

  return value;
}

export function readRegistrationEnvelopeData(payload: unknown, context: string): unknown {
  const envelope = readObject(payload, context);

  if (envelope["success"] !== true) {
    fail(`${context}.success`, "debe ser true");
  }

  readString(envelope["message"], `${context}.message`);

  if (!("data" in envelope)) {
    fail(`${context}.data`, "es obligatorio");
  }

  return envelope["data"];
}

export function mapRegistrationResult(
  raw: unknown,
  context = "auth.register.data",
): RegistrationResult {
  const result = readObject(raw, context);

  return { userId: readString(result["userId"], `${context}.userId`) };
}
