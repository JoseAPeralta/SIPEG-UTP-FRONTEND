// @vitest-environment node

import { describe, expect, it } from "vitest";

import { getActivityTypeColorKey, getUnitColorKey } from "./domainColors";

describe("getUnitColorKey", () => {
  it("should map faculty codes to their color key", () => {
    expect(getUnitColorKey("FIC")).toBe("fic");
    expect(getUnitColorKey("FIE")).toBe("fie");
    expect(getUnitColorKey("FII")).toBe("fii");
    expect(getUnitColorKey("FIM")).toBe("fim");
    expect(getUnitColorKey("FISC")).toBe("fisc");
    expect(getUnitColorKey("FCYT")).toBe("fcyt");
  });

  it("should normalize case and surrounding whitespace", () => {
    expect(getUnitColorKey("  fisc  ")).toBe("fisc");
  });

  it("should map each subdirectorate code to its own color key", () => {
    expect(getUnitColorKey("SUB-ACAD")).toBe("subAcad");
    expect(getUnitColorKey("SUB-ADMIN")).toBe("subAdmin");
    expect(getUnitColorKey("SUB-VIDA")).toBe("subVida");
    expect(getUnitColorKey("SUB-IPE")).toBe("subIpe");
  });

  it("should fall back to the default color for unknown codes", () => {
    expect(getUnitColorKey("OTROS")).toBe("default");
    expect(getUnitColorKey("FCT")).toBe("default");
  });
});

describe("getActivityTypeColorKey", () => {
  it("should map every activity type to its color key", () => {
    expect(getActivityTypeColorKey("WORKSHOP")).toBe("workshop");
    expect(getActivityTypeColorKey("SEMINAR")).toBe("seminar");
    expect(getActivityTypeColorKey("TALK")).toBe("talk");
    expect(getActivityTypeColorKey("CONFERENCE")).toBe("conference");
    expect(getActivityTypeColorKey("PANEL")).toBe("panel");
    expect(getActivityTypeColorKey("COURSE")).toBe("course");
    expect(getActivityTypeColorKey("COMPETITION")).toBe("competition");
    expect(getActivityTypeColorKey("OTHER")).toBe("other");
  });
});
