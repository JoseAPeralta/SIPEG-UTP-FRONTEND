// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  EVENT_PROGRAM_DESCRIPTION_MAX_LENGTH,
  EVENT_PROGRAM_LABEL_MAX_LENGTH,
  EVENT_PROGRAM_NAME_MAX_LENGTH,
  toCreateEventProgramRequest,
  toUpdateEventProgramRequest,
  validateEventProgramDraft,
  validateEventProgramUpdate,
  type EventProgramEditFormValues,
  type EventProgramFormValues,
} from "./eventProgramValidation";

const ACTIVE_UNITS = ["fic", "fisc"];

function values(overrides: Partial<EventProgramFormValues> = {}): EventProgramFormValues {
  return {
    description: "",
    endDate: "2026-06-19",
    label: "",
    name: "Semana de Datos Abiertos",
    organizationalUnitId: "fisc",
    startDate: "2026-06-15",
    ...overrides,
  };
}

describe("validateEventProgramDraft", () => {
  it("accepts a complete draft", () => {
    expect(validateEventProgramDraft(values(), ACTIVE_UNITS)).toEqual({});
  });

  it("rejects a blank name", () => {
    expect(validateEventProgramDraft(values({ name: "   " }), ACTIVE_UNITS).name).toBeDefined();
  });

  it("accepts the name at its contractual limit and rejects one character more", () => {
    expect(
      validateEventProgramDraft(
        values({ name: "a".repeat(EVENT_PROGRAM_NAME_MAX_LENGTH) }),
        ACTIVE_UNITS,
      ),
    ).toEqual({});
    expect(
      validateEventProgramDraft(
        values({ name: "a".repeat(EVENT_PROGRAM_NAME_MAX_LENGTH + 1) }),
        ACTIVE_UNITS,
      ).name,
    ).toBeDefined();
  });

  it("checks the optional description and label limits", () => {
    expect(
      validateEventProgramDraft(
        values({
          description: "d".repeat(EVENT_PROGRAM_DESCRIPTION_MAX_LENGTH),
          label: "l".repeat(EVENT_PROGRAM_LABEL_MAX_LENGTH),
        }),
        ACTIVE_UNITS,
      ),
    ).toEqual({});

    const overLimit = validateEventProgramDraft(
      values({
        description: "d".repeat(EVENT_PROGRAM_DESCRIPTION_MAX_LENGTH + 1),
        label: "l".repeat(EVENT_PROGRAM_LABEL_MAX_LENGTH + 1),
      }),
      ACTIVE_UNITS,
    );
    expect(overLimit.description).toBeDefined();
    expect(overLimit.label).toBeDefined();
  });

  it("rejects a missing unit and a unit outside the active catalog", () => {
    expect(
      validateEventProgramDraft(values({ organizationalUnitId: "" }), ACTIVE_UNITS)
        .organizationalUnitId,
    ).toBeDefined();
    expect(
      validateEventProgramDraft(values({ organizationalUnitId: "fim" }), ACTIVE_UNITS)
        .organizationalUnitId,
    ).toBeDefined();
  });

  it("rejects malformed, impossible and missing dates", () => {
    expect(
      validateEventProgramDraft(values({ startDate: "15/06/2026" }), ACTIVE_UNITS).startDate,
    ).toBeDefined();
    expect(
      validateEventProgramDraft(values({ endDate: "2026-02-30" }), ACTIVE_UNITS).endDate,
    ).toBeDefined();
    expect(
      validateEventProgramDraft(values({ startDate: "" }), ACTIVE_UNITS).startDate,
    ).toBeDefined();
  });

  it("accepts a leap day", () => {
    expect(
      validateEventProgramDraft(
        values({ endDate: "2028-02-29", startDate: "2028-02-29" }),
        ACTIVE_UNITS,
      ),
    ).toEqual({});
  });

  it("accepts the same start and end date", () => {
    expect(validateEventProgramDraft(values({ endDate: "2026-06-15" }), ACTIVE_UNITS)).toEqual({});
  });

  it("rejects an inverted range", () => {
    expect(
      validateEventProgramDraft(
        values({ endDate: "2026-06-14", startDate: "2026-06-15" }),
        ACTIVE_UNITS,
      ).endDate,
    ).toBeDefined();
  });
});

describe("toCreateEventProgramRequest", () => {
  it("trims text and normalizes blank optionals to null", () => {
    expect(
      toCreateEventProgramRequest(values({ description: "  ", label: "  ", name: "  Programa  " })),
    ).toEqual({
      description: null,
      endDate: "2026-06-19",
      label: null,
      name: "Programa",
      organizationalUnitId: "fisc",
      startDate: "2026-06-15",
    });
  });

  it("keeps the provided optional text", () => {
    expect(
      toCreateEventProgramRequest(values({ description: "Detalle", label: "Etiqueta" })),
    ).toMatchObject({ description: "Detalle", label: "Etiqueta" });
  });
});

function editValues(
  overrides: Partial<EventProgramEditFormValues> = {},
): EventProgramEditFormValues {
  return {
    description: "",
    endDate: "2026-06-19",
    label: "",
    name: "Semana de Datos Abiertos",
    startDate: "2026-06-15",
    ...overrides,
  };
}

describe("validateEventProgramUpdate", () => {
  it("accepts a complete additional program", () => {
    expect(validateEventProgramUpdate(editValues(), { isDefault: false })).toEqual({});
  });

  it("requires a name and limits the optional text", () => {
    expect(
      validateEventProgramUpdate(editValues({ name: "   " }), { isDefault: false }).name,
    ).toBeDefined();
    expect(
      validateEventProgramUpdate(
        editValues({ name: "a".repeat(EVENT_PROGRAM_NAME_MAX_LENGTH + 1) }),
        { isDefault: false },
      ).name,
    ).toBeDefined();
    const overLimit = validateEventProgramUpdate(
      editValues({
        description: "d".repeat(EVENT_PROGRAM_DESCRIPTION_MAX_LENGTH + 1),
        label: "l".repeat(EVENT_PROGRAM_LABEL_MAX_LENGTH + 1),
      }),
      { isDefault: false },
    );
    expect(overLimit.description).toBeDefined();
    expect(overLimit.label).toBeDefined();
  });

  it("requires coherent dates for an additional program", () => {
    expect(
      validateEventProgramUpdate(editValues({ startDate: "" }), { isDefault: false }).startDate,
    ).toBeDefined();
    expect(
      validateEventProgramUpdate(editValues({ endDate: "2026-02-30" }), { isDefault: false })
        .endDate,
    ).toBeDefined();
    expect(
      validateEventProgramUpdate(editValues({ endDate: "2026-06-14" }), { isDefault: false })
        .endDate,
    ).toBeDefined();
  });

  it("ignores the dates of the permanent agenda", () => {
    expect(
      validateEventProgramUpdate(editValues({ endDate: "", startDate: "" }), { isDefault: true }),
    ).toEqual({});
  });
});

describe("toUpdateEventProgramRequest", () => {
  it("trims text and omits immutable and banner fields", () => {
    expect(
      toUpdateEventProgramRequest(
        editValues({ description: "  ", label: "  ", name: "  Programa  " }),
        { isDefault: false },
      ),
    ).toEqual({
      description: null,
      endDate: "2026-06-19",
      label: null,
      name: "Programa",
      startDate: "2026-06-15",
    });
  });

  it("omits the dates of the permanent agenda", () => {
    const request = toUpdateEventProgramRequest(editValues(), { isDefault: true });
    expect(request).toEqual({
      description: null,
      label: null,
      name: "Semana de Datos Abiertos",
    });
    expect("startDate" in request).toBe(false);
    expect("endDate" in request).toBe(false);
  });
});
