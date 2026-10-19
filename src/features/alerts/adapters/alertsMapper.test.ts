// @vitest-environment node

import { describe, expect, it } from "vitest";

import { createAlert, createAlertsPage } from "@/test/factories";

import {
  AlertsMappingError,
  mapAlert,
  mapAlertResponse,
  mapAlertsPage,
  mapMarkAllAlertsReadResult,
} from "./alertsMapper";

function envelope(data: unknown) {
  return { data, message: "ok", success: true };
}

describe("mapAlert", () => {
  it("should validate every contractual field", () => {
    const alert = createAlert();

    expect(mapAlert(alert)).toEqual(alert);
  });

  it("should accept every contractual alert type", () => {
    const types = [
      "PROPOSAL_RECEIVED",
      "PROPOSAL_UPDATED",
      "PROPOSAL_RESPONDED",
      "PROGRAM_UPDATED",
      "PROGRAM_ARCHIVED",
      "ACTIVITY_UPDATED",
      "ACTIVITY_CANCELLED",
      "CERTIFICATE_ISSUED",
    ] as const;

    types.forEach((type) => expect(mapAlert(createAlert({ type })).type).toBe(type));
  });

  it("should reject an unknown type or target kind", () => {
    expect(() => mapAlert({ ...createAlert(), type: "PROPOSAL_ARCHIVED" })).toThrow(
      AlertsMappingError,
    );
    expect(() =>
      mapAlert({ ...createAlert(), target: { id: "proposal-1", kind: "USER" } }),
    ).toThrow(AlertsMappingError);
  });

  it("should reject missing fields and a non boolean isRead", () => {
    const alert = createAlert();

    expect(() => mapAlert({ ...alert, id: "" })).toThrow(AlertsMappingError);
    expect(() => mapAlert({ ...alert, isRead: "false" })).toThrow(AlertsMappingError);
    expect(() => mapAlert({ ...alert, target: undefined })).toThrow(AlertsMappingError);
  });
});

describe("mapAlertsPage", () => {
  it("should map the envelope and keep the page metadata", () => {
    const page = createAlertsPage({ page: 2, total: 21, totalPages: 2 });

    expect(mapAlertsPage(envelope(page))).toEqual(page);
  });

  it("should reject a failing envelope or corrupt metadata", () => {
    expect(() =>
      mapAlertsPage({ data: createAlertsPage(), message: "no", success: false }),
    ).toThrow(AlertsMappingError);
    expect(() => mapAlertsPage(envelope({ ...createAlertsPage(), totalPages: "2" }))).toThrow(
      AlertsMappingError,
    );
    expect(() => mapAlertsPage(envelope({ ...createAlertsPage(), items: {} }))).toThrow(
      AlertsMappingError,
    );
  });
});

describe("mapAlertResponse", () => {
  it("should map the alert returned after marking it as read", () => {
    const alert = createAlert({ id: "alert-9", isRead: true });

    expect(mapAlertResponse(envelope(alert))).toEqual(alert);
  });

  it("should reject a corrupt alert or a failing envelope", () => {
    expect(() =>
      mapAlertResponse(envelope({ ...createAlert(), type: "PROPOSAL_ARCHIVED" })),
    ).toThrow(AlertsMappingError);
    expect(() => mapAlertResponse({ data: createAlert(), message: "no", success: false })).toThrow(
      AlertsMappingError,
    );
  });
});

describe("mapMarkAllAlertsReadResult", () => {
  it("should map the updated count", () => {
    expect(mapMarkAllAlertsReadResult(envelope({ updatedCount: 3 }))).toEqual({ updatedCount: 3 });
  });

  it("should reject a negative, missing or non integer count", () => {
    expect(() => mapMarkAllAlertsReadResult(envelope({ updatedCount: -1 }))).toThrow(
      AlertsMappingError,
    );
    expect(() => mapMarkAllAlertsReadResult(envelope({}))).toThrow(AlertsMappingError);
    expect(() => mapMarkAllAlertsReadResult(envelope({ updatedCount: "3" }))).toThrow(
      AlertsMappingError,
    );
  });
});
