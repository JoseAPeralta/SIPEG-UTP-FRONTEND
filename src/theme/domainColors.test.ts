import { describe, expect, it } from "vitest";

import { getActivityTypeColorKey, getUnitColorKey } from "./domainColors";

describe("getUnitColorKey", () => {
  it("should map faculty codes to their color key", () => {
    expect(getUnitColorKey({ code: "FIC" })).toBe("fic");
    expect(getUnitColorKey({ code: "FIE" })).toBe("fie");
    expect(getUnitColorKey({ code: "FII" })).toBe("fii");
    expect(getUnitColorKey({ code: "FIM" })).toBe("fim");
    expect(getUnitColorKey({ code: "FISC" })).toBe("fisc");
    expect(getUnitColorKey({ code: "FCYT" })).toBe("fcyt");
  });

  it("should normalize case and surrounding whitespace", () => {
    expect(getUnitColorKey({ code: "  fisc  " })).toBe("fisc");
  });

  it("should map each subdirectorate code to its own color key", () => {
    expect(getUnitColorKey({ code: "SUB-ACAD" })).toBe("subAcad");
    expect(getUnitColorKey({ code: "SUB-ADMIN" })).toBe("subAdmin");
    expect(getUnitColorKey({ code: "SUB-VIDA" })).toBe("subVida");
    expect(getUnitColorKey({ code: "SUB-IPE" })).toBe("subIpe");
  });

  it("should fall back to the default color for unknown codes", () => {
    expect(getUnitColorKey({ code: "OTROS" })).toBe("default");
    expect(getUnitColorKey({ code: "FCT" })).toBe("default");
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
