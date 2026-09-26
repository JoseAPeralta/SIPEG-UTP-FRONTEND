import { describe, expect, it } from "vitest";

import {
  formatActivityDate,
  formatDateRange,
  formatDateTime,
  formatProgramDateRange,
} from "./dateFormatting";

describe("formatActivityDate", () => {
  it("should format an institutional date for Panama", () => {
    expect(formatActivityDate("2026-06-15")).toMatch(/15/);
    expect(formatActivityDate("2026-06-15")).toMatch(/2026/);
  });
});

describe("formatDateRange", () => {
  it("should join both ends of the range", () => {
    expect(formatDateRange("2026-06-15", "2026-06-19")).toContain(" - ");
  });
});

describe("formatDateTime", () => {
  it("should format an ISO timestamp for Panama without showing the raw value", () => {
    const formatted = formatDateTime("2026-05-01T10:00:00.000Z");

    expect(formatted).toMatch(/2026/);
    expect(formatted).not.toBe("2026-05-01T10:00:00.000Z");
  });
});

describe("formatProgramDateRange", () => {
  it("should return null when a default program has no dates", () => {
    expect(formatProgramDateRange({ endDate: null, startDate: null })).toBeNull();
    expect(formatProgramDateRange({ endDate: "2026-06-19", startDate: null })).toBeNull();
    expect(formatProgramDateRange({ endDate: null, startDate: "2026-06-15" })).toBeNull();
  });

  it("should format additional programs with both dates", () => {
    expect(formatProgramDateRange({ endDate: "2026-06-19", startDate: "2026-06-15" })).toContain(
      " - ",
    );
  });
});
