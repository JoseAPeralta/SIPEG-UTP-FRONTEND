import { describe, expect, it } from "vitest";

import {
  findInstitutionalUnitByName,
  institutionalUnitFilterOptions,
  institutionalUnits,
  institutionalUnitsByCode,
  ORGANIZATIONAL_UNIT_CODES,
} from "./unitRegistry";

describe("unit registry", () => {
  it("should expose one institutional unit per declared code", () => {
    expect(institutionalUnits).toHaveLength(ORGANIZATIONAL_UNIT_CODES.length);
    expect(new Set(institutionalUnits.map((unit) => unit.code))).toEqual(
      new Set(ORGANIZATIONAL_UNIT_CODES),
    );
  });

  it("should keep every code, label and type coherent inside a ficha", () => {
    institutionalUnits.forEach((unit) => {
      expect(institutionalUnitsByCode[unit.code]).toBe(unit);
      expect(unit.label.trim()).not.toBe("");
      expect(unit.label).toBe(unit.label.trim());
      expect(["FACULTY", "SUBDIRECTORATE"]).toContain(unit.type);
    });
  });

  it("should declare the six faculties and the four subdirectorates", () => {
    expect(institutionalUnits.filter((unit) => unit.type === "FACULTY")).toHaveLength(6);
    expect(institutionalUnits.filter((unit) => unit.type === "SUBDIRECTORATE")).toHaveLength(4);
  });

  it("should use unique labels, because the name is the join key with the public listing", () => {
    const labels = institutionalUnits.map((unit) => unit.label);

    expect(new Set(labels).size).toBe(labels.length);
  });

  it("should resolve a unit by its exact label", () => {
    expect(findInstitutionalUnitByName("Facultad de Ingeniería Civil")).toEqual(
      institutionalUnitsByCode.FIC,
    );
    expect(findInstitutionalUnitByName("Subdirección de Vida Universitaria")).toEqual(
      institutionalUnitsByCode["SUB-VIDA"],
    );
  });

  it("should tolerate surrounding whitespace when resolving by label", () => {
    expect(findInstitutionalUnitByName("  Facultad de Ciencias y Tecnología  ")?.code).toBe("FCYT");
  });

  it("should return null for a label the registry does not know", () => {
    expect(findInstitutionalUnitByName("Facultad Inventada")).toBeNull();
    expect(findInstitutionalUnitByName("")).toBeNull();
  });

  it("should build filter options prefixed with the code", () => {
    const options = institutionalUnitFilterOptions();

    expect(options).toHaveLength(ORGANIZATIONAL_UNIT_CODES.length);
    expect(options[0]).toEqual({
      id: "FCYT",
      label: "FCYT - Facultad de Ciencias y Tecnología",
    });
  });
});
describe("findInstitutionalUnitByName normalization", () => {
  it("should match a name written without accents", () => {
    expect(findInstitutionalUnitByName("Facultad de Ingenieria Civil")?.code).toBe("FIC");
    expect(findInstitutionalUnitByName("Subdireccion de Vida Universitaria")?.code).toBe(
      "SUB-VIDA",
    );
  });

  it("should tolerate collapsed and repeated whitespace", () => {
    expect(findInstitutionalUnitByName("  Facultad   de  Ciencias y Tecnología ")?.code).toBe(
      "FCYT",
    );
  });

  it("should ignore casing", () => {
    expect(findInstitutionalUnitByName("FACULTAD DE INGENIERÍA MECÁNICA")?.code).toBe("FIM");
  });
});
