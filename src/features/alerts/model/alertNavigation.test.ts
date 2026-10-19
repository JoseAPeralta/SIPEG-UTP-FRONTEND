// @vitest-environment node

import { describe, expect, it } from "vitest";

import { createUserScope } from "@/test/factories";

import { resolveAlertDestination } from "./alertNavigation";

const activityScope = createUserScope({
  id: "activity-1",
  permissions: [{ name: "activity:read", origin: "INHERITED", validFrom: null, validUntil: null }],
  type: "activity",
});

describe("resolveAlertDestination", () => {
  it("enlaza una actividad a su contexto operativo con el id codificado", () => {
    const scope = createUserScope({ ...activityScope, id: "actividad con espacio" });

    expect(
      resolveAlertDestination({ id: "actividad con espacio", kind: "ACTIVITY" }, [scope]),
    ).toEqual({
      label: "Ver contexto de la actividad",
      to: "/operaciones/actividades/actividad%20con%20espacio",
    });
  });

  it("enlaza un programa a su contexto operativo", () => {
    const scope = createUserScope({ id: "program-1", type: "program" });

    expect(resolveAlertDestination({ id: "program-1", kind: "EVENT_PROGRAM" }, [scope])).toEqual({
      label: "Ver contexto del programa",
      to: "/operaciones/programas/program-1",
    });
  });

  it("no enlaza un destino ausente del descubrimiento", () => {
    expect(
      resolveAlertDestination({ id: "activity-9", kind: "ACTIVITY" }, [activityScope]),
    ).toBeNull();
    expect(
      resolveAlertDestination({ id: "program-1", kind: "EVENT_PROGRAM" }, [activityScope]),
    ).toBeNull();
  });

  it("no inventa detalle para propuestas ni certificados", () => {
    expect(
      resolveAlertDestination({ id: "proposal-1", kind: "PROPOSAL" }, [activityScope]),
    ).toBeNull();
    expect(
      resolveAlertDestination({ id: "certificate-1", kind: "CERTIFICATE" }, [activityScope]),
    ).toBeNull();
  });
});
