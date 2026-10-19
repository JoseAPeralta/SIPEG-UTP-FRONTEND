// @vitest-environment node

import { describe, expect, it } from "vitest";

import { createAdministrativeActivityDetail } from "@/test/factories";

import type {
  CancelActivityRequest,
  CreateActivityRequest,
  UpdateActivityRequest,
} from "./activityRequests";
import {
  activityFormValuesFromDetail,
  ACTIVITY_EQUIPMENT_ITEMS_MAX,
  ACTIVITY_SPEAKERS_MAX_ITEMS,
  EMPTY_ACTIVITY_FORM_VALUES,
  formatEquipmentLines,
  parseEquipmentLines,
  toCreateActivityRequest,
  toUpdateActivityRequest,
  validateActivityValues,
  type ActivityFormValues,
} from "./activityValidation";

function validValues(overrides: Partial<ActivityFormValues> = {}): ActivityFormValues {
  return {
    ...EMPTY_ACTIVITY_FORM_VALUES,
    date: "2026-08-24",
    endTime: "11:00",
    name: "Taller de prueba",
    startTime: "09:00",
    type: "WORKSHOP",
    ...overrides,
  };
}

type HasNotificationIntention<TRequest> = "notifyAttendees" extends keyof TRequest ? true : false;

describe("notification boundary", () => {
  it("keeps the notification intention out of the request types", () => {
    const createHasNotification: HasNotificationIntention<CreateActivityRequest> = false;
    const updateHasNotification: HasNotificationIntention<UpdateActivityRequest> = false;
    const cancelHasNotification: HasNotificationIntention<CancelActivityRequest> = false;

    expect([createHasNotification, updateHasNotification, cancelHasNotification]).toEqual([
      false,
      false,
      false,
    ]);
  });
});

describe("parseEquipmentLines", () => {
  it("should trim and drop empty lines", () => {
    expect(parseEquipmentLines(" Proyector \n\n  Audio\n")).toEqual(["Proyector", "Audio"]);
    expect(formatEquipmentLines(["Proyector", "Audio"])).toBe("Proyector\nAudio");
  });
});

describe("validateActivityValues", () => {
  it("should accept a complete activity", () => {
    expect(validateActivityValues(validValues())).toEqual({});
  });

  it("should reject impossible dates, inverted times and missing type", () => {
    const errors = validateActivityValues(
      validValues({ date: "2026-02-30", endTime: "09:00", startTime: "10:00", type: "" }),
    );

    expect(errors.date).toContain("fecha válida");
    expect(errors.endTime).toContain("posterior");
    expect(errors.type).toContain("tipo");
  });

  it("should bound the capacity, the banner and the equipment", () => {
    expect(validateActivityValues(validValues({ capacity: "0" })).capacity).toBeDefined();
    expect(validateActivityValues(validValues({ capacity: "10.5" })).capacity).toBeDefined();
    expect(validateActivityValues(validValues({ capacity: "12" })).capacity).toBeUndefined();
    expect(validateActivityValues(validValues({ bannerUrl: "no-es-url" })).bannerUrl).toBeDefined();
    expect(
      validateActivityValues(validValues({ bannerUrl: "https://ejemplo.com/banner.png" }))
        .bannerUrl,
    ).toBeUndefined();
    const manyItems = Array.from(
      { length: ACTIVITY_EQUIPMENT_ITEMS_MAX + 1 },
      (_, index) => `Equipo ${index}`,
    ).join("\n");
    expect(validateActivityValues(validValues({ equipment: manyItems })).equipment).toContain("20");
  });

  it("should not revalidate an unchanged legacy banner on edit", () => {
    const values = validValues({ bannerUrl: "actividad-legada.jpg" });

    expect(validateActivityValues(values).bannerUrl).toBeDefined();
    expect(
      validateActivityValues(values, { originalBannerUrl: "actividad-legada.jpg" }).bannerUrl,
    ).toBeUndefined();
    expect(
      validateActivityValues(values, { originalBannerUrl: "otro.jpg" }).bannerUrl,
    ).toBeDefined();
  });

  it("should validate each speaker and bound the list", () => {
    const errors = validateActivityValues(
      validValues({
        speakers: [{ email: "correo-invalido", firstName: "", lastName: "", organization: "" }],
      }),
    );

    expect(errors.speakers?.[0]?.firstName).toBeDefined();
    expect(errors.speakers?.[0]?.lastName).toBeDefined();
    expect(errors.speakers?.[0]?.email).toBeDefined();

    const tooMany = Array.from({ length: ACTIVITY_SPEAKERS_MAX_ITEMS + 1 }, () => ({
      email: "",
      firstName: "Ana",
      lastName: "Perez",
      organization: "",
    }));
    expect(validateActivityValues(validValues({ speakers: tooMany })).speakersLimit).toContain(
      String(ACTIVITY_SPEAKERS_MAX_ITEMS),
    );
  });
});

describe("toCreateActivityRequest", () => {
  it("should build the contract body with the program and optional fields", () => {
    const request = toCreateActivityRequest(
      validValues({
        bannerUrl: "https://ejemplo.com/banner.png",
        capacity: "50",
        classroomId: "classroom-1",
        description: "  Descripcion  ",
        equipment: "Proyector\nAudio",
        speakers: [
          {
            email: " ana@utp.ac.pa ",
            firstName: " Ana ",
            lastName: " Perez ",
            organization: " UTP ",
          },
        ],
      }),
      { eventProgramId: "program-1" },
    );

    expect(request).toEqual({
      bannerUrl: "https://ejemplo.com/banner.png",
      classroomId: "classroom-1",
      date: "2026-08-24",
      description: "Descripcion",
      endTime: "11:00",
      equipment: ["Proyector", "Audio"],
      eventProgramId: "program-1",
      maxCapacity: 50,
      name: "Taller de prueba",
      speakers: [
        { email: "ana@utp.ac.pa", firstName: "Ana", lastName: "Perez", organization: "UTP" },
      ],
      startTime: "09:00",
      type: "WORKSHOP",
    });
  });

  it("should omit absent optionals and send null description", () => {
    const request = toCreateActivityRequest(validValues(), { eventProgramId: "program-1" });

    expect(request.description).toBeNull();
    expect(request).not.toHaveProperty("bannerUrl");
    expect(request).not.toHaveProperty("maxCapacity");
    expect(request).not.toHaveProperty("equipment");
    expect(request).not.toHaveProperty("speakers");
    expect(request).not.toHaveProperty("classroomId");
  });

  it.each([true, false])(
    "should drop a runtime notification value of %s from the create request",
    (notifyAttendees) => {
      const values = {
        ...validValues(),
        notifyAttendees,
      } as ActivityFormValues;

      const request = toCreateActivityRequest(values, { eventProgramId: "program-1" });

      expect(request).not.toHaveProperty("notifyAttendees");
      expect(request).toEqual({
        date: "2026-08-24",
        description: null,
        endTime: "11:00",
        eventProgramId: "program-1",
        name: "Taller de prueba",
        startTime: "09:00",
        type: "WORKSHOP",
      });
    },
  );
});

describe("toUpdateActivityRequest", () => {
  const original = createAdministrativeActivityDetail();

  it("should send only the modified fields", () => {
    const values = activityFormValuesFromDetail(original);
    values.description = "Otra descripcion";

    expect(toUpdateActivityRequest(values, { original, speakersDirty: false })).toEqual({
      description: "Otra descripcion",
    });
  });

  it.each([true, false])(
    "should drop a runtime notification value of %s from the update request",
    (notifyAttendees) => {
      const values = {
        ...activityFormValuesFromDetail(original),
        notifyAttendees,
      } as ActivityFormValues;

      const request = toUpdateActivityRequest(values, { original, speakersDirty: false });

      expect(request).not.toHaveProperty("notifyAttendees");
      expect(request).toEqual({});
    },
  );

  it("should not resend speakers when only another field changes", () => {
    const values = activityFormValuesFromDetail(original);
    values.name = "Nombre nuevo";

    const request = toUpdateActivityRequest(values, { original, speakersDirty: false });

    expect(request).toEqual({ name: "Nombre nuevo" });
    expect(request).not.toHaveProperty("speakers");
  });

  it("should resend speakers only when they were explicitly edited", () => {
    const values = activityFormValuesFromDetail(original);
    values.speakers = [{ email: "", firstName: "Ana", lastName: "Perez", organization: "" }];

    const request = toUpdateActivityRequest(values, { original, speakersDirty: true });

    expect(request.speakers).toEqual([
      { email: null, firstName: "Ana", lastName: "Perez", organization: null },
    ]);
  });

  it("should clear the capacity and the classroom with null", () => {
    const values = activityFormValuesFromDetail(original);
    values.capacity = "";
    values.classroomId = "";

    const request = toUpdateActivityRequest(values, { original, speakersDirty: false });

    expect(request.maxCapacity).toBeNull();
    expect(request.classroomId).toBeNull();
  });

  it("should treat an empty banner as removal", () => {
    const withBanner = createAdministrativeActivityDetail({
      bannerUrl: "https://ejemplo.com/banner.png",
    });
    const values = activityFormValuesFromDetail(withBanner);
    values.bannerUrl = "";

    expect(
      toUpdateActivityRequest(values, { original: withBanner, speakersDirty: false }).bannerUrl,
    ).toBeNull();
  });
});

describe("activityFormValuesFromDetail", () => {
  it("should prefill every editable value", () => {
    const values = activityFormValuesFromDetail(
      createAdministrativeActivityDetail({
        capacity: null,
        classroom: null,
        description: null,
        equipment: [],
        speakers: [{ firstName: "Ana", id: "speaker-1", lastName: "Perez" }],
      }),
    );

    expect(values).toMatchObject({
      capacity: "",
      classroomId: "",
      description: "",
      equipment: "",
      name: "Actividad de prueba",
      type: "TALK",
    });
    expect(values.speakers).toEqual([
      { email: "", firstName: "Ana", lastName: "Perez", organization: "" },
    ]);
  });
});
