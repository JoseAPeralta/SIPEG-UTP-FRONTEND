import {
  isAlertTargetKind,
  isAlertType,
  type Alert,
  type AlertTarget,
  type AlertsPage,
  type MarkAllAlertsReadResult,
} from "../model/alert";

export class AlertsMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AlertsMappingError";
  }
}

function fail(context: string, detail: string): never {
  throw new AlertsMappingError(`${context}: ${detail}`);
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

function readBoolean(value: unknown, context: string): boolean {
  if (typeof value !== "boolean") fail(context, "se esperaba un booleano");
  return value;
}

function readInteger(value: unknown, context: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    fail(context, "se esperaba un entero");
  }
  return value;
}

function readArray(value: unknown, context: string): unknown[] {
  if (!Array.isArray(value)) fail(context, "se esperaba una lista");
  return value;
}

function readAlertTarget(value: unknown, context: string): AlertTarget {
  const target = readObject(value, context);
  const kind = target["kind"];

  if (!isAlertTargetKind(kind)) {
    fail(`${context}.kind`, `valor fuera del contrato: ${String(kind)}`);
  }

  return { id: readString(target["id"], `${context}.id`), kind };
}

export function mapAlert(raw: unknown, context = "alert"): Alert {
  const alert = readObject(raw, context);
  const type = alert["type"];

  if (!isAlertType(type)) {
    fail(`${context}.type`, `valor fuera del contrato: ${String(type)}`);
  }

  return {
    createdAt: readString(alert["createdAt"], `${context}.createdAt`),
    id: readString(alert["id"], `${context}.id`),
    isRead: readBoolean(alert["isRead"], `${context}.isRead`),
    target: readAlertTarget(alert["target"], `${context}.target`),
    type,
  };
}

function readData(payload: unknown, context: string): Record<string, unknown> {
  const envelope = readObject(payload, context);
  if (envelope["success"] !== true) fail(`${context}.success`, "debe ser true");
  readString(envelope["message"], `${context}.message`);
  return readObject(envelope["data"], `${context}.data`);
}

export function mapAlertResponse(payload: unknown, context = "alertResponse"): Alert {
  return mapAlert(readData(payload, context), `${context}.data`);
}

export function mapMarkAllAlertsReadResult(
  payload: unknown,
  context = "markAllAlertsRead",
): MarkAllAlertsReadResult {
  const data = readData(payload, context);
  const updatedCount = readInteger(data["updatedCount"], `${context}.data.updatedCount`);

  if (updatedCount < 0) fail(`${context}.data.updatedCount`, "no puede ser negativo");

  return { updatedCount };
}

export function mapAlertsPage(payload: unknown, context = "alerts"): AlertsPage {
  const data = readData(payload, context);

  return {
    items: readArray(data["items"], `${context}.data.items`).map((item, index) =>
      mapAlert(item, `${context}.data.items[${index}]`),
    ),
    limit: readInteger(data["limit"], `${context}.data.limit`),
    page: readInteger(data["page"], `${context}.data.page`),
    total: readInteger(data["total"], `${context}.data.total`),
    totalPages: readInteger(data["totalPages"], `${context}.data.totalPages`),
  };
}
