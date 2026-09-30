import { describe, expect, it } from "vitest";

import type { ProfileUpdateRequest } from "@/app/adapters/contracts";

import {
  PROFILE_NAME_MAX_LENGTH,
  toProfileUpdateRequest,
  validateProfileNames,
  type ProfileFormValues,
} from "./profileValidation";

const values: ProfileFormValues = {
  careerId: "software",
  firstName: "Mariana",
  lastName: "Rodriguez",
  unitId: "fisc",
};

const original: ProfileUpdateRequest = {
  careerId: "software",
  firstName: "Mariana",
  lastName: "Rodriguez",
  unitId: "fisc",
};

describe("validateProfileNames", () => {
  it("should reject an empty name", () => {
    expect(validateProfileNames({ ...values, firstName: "   " }).firstName).toBe(
      "El nombre debe tener al menos 2 caracteres.",
    );
  });

  it("should reject a name shorter than the contract minimum", () => {
    expect(validateProfileNames({ ...values, firstName: "M" }).firstName).toBe(
      "El nombre debe tener al menos 2 caracteres.",
    );
  });

  it("should accept a name at the contract minimum", () => {
    expect(validateProfileNames({ ...values, firstName: "Ma" }).firstName).toBeUndefined();
  });

  it("should reject a name longer than the contract maximum", () => {
    const firstName = "a".repeat(PROFILE_NAME_MAX_LENGTH + 1);

    expect(validateProfileNames({ ...values, firstName }).firstName).toBe(
      "El nombre no puede exceder 100 caracteres.",
    );
  });

  it("should measure the trimmed name", () => {
    expect(validateProfileNames({ ...values, firstName: "  ab  " }).firstName).toBeUndefined();
  });

  it("should report both names when both are invalid", () => {
    expect(validateProfileNames({ ...values, firstName: "M", lastName: "R" })).toEqual({
      firstName: "El nombre debe tener al menos 2 caracteres.",
      lastName: "El apellido debe tener al menos 2 caracteres.",
    });
  });

  it("should accept a valid pair of names", () => {
    expect(validateProfileNames(values)).toEqual({});
  });
});

describe("toProfileUpdateRequest", () => {
  it("should send only the fields that changed", () => {
    expect(toProfileUpdateRequest({ ...values, firstName: "Mariana Paula" }, original)).toEqual({
      firstName: "Mariana Paula",
    });
  });

  it("should send an explicit null unit for the Otro option", () => {
    expect(toProfileUpdateRequest({ ...values, unitId: "" }, original)).toEqual({ unitId: null });
  });

  it("should send the selected career when it changed", () => {
    expect(
      toProfileUpdateRequest({ ...values, careerId: "civil", unitId: "fic" }, original),
    ).toEqual({ careerId: "civil", unitId: "fic" });
  });

  it("should omit the career when the unit changed and no career was chosen", () => {
    expect(toProfileUpdateRequest({ ...values, careerId: "", unitId: "fic" }, original)).toEqual({
      unitId: "fic",
    });
  });

  it("should trim the names before sending them", () => {
    expect(
      toProfileUpdateRequest(
        { ...values, firstName: "  Mariana Paula  ", lastName: "  Rodriguez Vega  " },
        original,
      ),
    ).toEqual({ firstName: "Mariana Paula", lastName: "Rodriguez Vega" });
  });

  it("should not treat a reformatted but equal name as a change", () => {
    expect(toProfileUpdateRequest({ ...values, firstName: "Mariana " }, original)).toEqual({});
  });

  it("should never carry a career for the Otro option", () => {
    expect(toProfileUpdateRequest({ ...values, unitId: "" }, original)).toEqual({ unitId: null });
  });

  it("should produce an empty request when nothing changed", () => {
    expect(toProfileUpdateRequest(values, original)).toEqual({});
  });
});
