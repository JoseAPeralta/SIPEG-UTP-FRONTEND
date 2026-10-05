// @vitest-environment node

import { describe, expect, it } from "vitest";

import { ALERT_TYPES } from "./alert";
import { alertReadStateLabels, alertTypeLabels } from "./alertLabels";

describe("alertLabels", () => {
  it("traduce los ocho tipos del contrato sin dejar codigos", () => {
    expect(Object.keys(alertTypeLabels).sort()).toEqual([...ALERT_TYPES].sort());
    expect(new Set(Object.values(alertTypeLabels)).size).toBe(ALERT_TYPES.length);
    expect(alertTypeLabels.ACTIVITY_CANCELLED).toBe("Actividad cancelada");
    expect(alertTypeLabels.CERTIFICATE_ISSUED).toBe("Certificado emitido");
  });

  it("distingue leida de sin leer con texto y no solo color", () => {
    expect(alertReadStateLabels.read).toBe("Leída");
    expect(alertReadStateLabels.unread).toBe("Sin leer");
  });
});
