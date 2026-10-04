import { describe, expect, it } from "vitest";

import { mapCareer, mapCareerResponse, mapCareersPage } from "./careersMapper";

const career = {
  code: "SOFTWARE",
  description: "Desarrollo de software",
  id: "career-1",
  name: "Ingenieria de Software",
  unit: { code: "FISC", id: "unit-1", name: "Facultad de Sistemas" },
};

describe("careersMapper", () => {
  it("should map institutional and global careers", () => {
    expect(mapCareer(career)).toMatchObject({
      description: "Desarrollo de software",
      id: "career-1",
      unitId: "unit-1",
    });
    expect(mapCareer({ ...career, code: "OTROS", id: "other", unit: null })).toMatchObject({
      unitId: null,
    });
  });

  it("should validate the complete paginated response", () => {
    expect(
      mapCareersPage({
        data: { items: [career], limit: 50, page: 1, total: 1, totalPages: 1 },
        message: "ok",
        success: true,
      }),
    ).toMatchObject({ items: [{ id: "career-1" }], totalPages: 1 });
  });

  it("should reject missing contracted fields", () => {
    expect(() => mapCareer({ ...career, description: undefined })).toThrow(/description/);
    expect(() => mapCareer({ ...career, unit: { id: "unit-1" } })).toThrow(/code/);
  });

  it("validates successful mutation envelopes before exposing a career", () => {
    expect(
      mapCareerResponse({ data: career, message: "ok", success: true }, "careers.create"),
    ).toMatchObject({ id: "career-1" });
    expect(() => mapCareerResponse({ data: career, message: "no", success: false })).toThrow(
      /success/,
    );
  });
});
