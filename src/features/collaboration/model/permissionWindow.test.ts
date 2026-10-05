// @vitest-environment node
import { expect, it } from "vitest";
import { localDateTimeToInstant, validatePermissionWindow } from "./permissionWindow";

it("converts a local datetime input to an ISO instant and rejects impossible values", () => {
  expect(localDateTimeToInstant("")).toBeNull();
  expect(localDateTimeToInstant("   ")).toBeNull();
  const instant = localDateTimeToInstant("2026-10-05T14:30");
  expect(instant).not.toBeNull();
  expect(new Date(instant!).getTime()).toBe(new Date(2026, 9, 5, 14, 30).getTime());
  expect(localDateTimeToInstant("2026-02-31T10:00")).toBeNull();
  expect(localDateTimeToInstant("2026-10-05 14:30")).toBeNull();
  expect(localDateTimeToInstant("not-a-date")).toBeNull();
});

it("requires an end after the start and in the future, while allowing scheduled starts", () => {
  const now = Date.parse("2026-10-05T12:00:00Z");
  expect(validatePermissionWindow({ validFrom: null, validUntil: null }, now)).toBeNull();
  expect(
    validatePermissionWindow({ validFrom: "2026-10-05T12:00:00Z", validUntil: null }, now),
  ).toBeNull();
  expect(
    validatePermissionWindow({ validFrom: null, validUntil: "2026-10-05T12:00:01Z" }, now),
  ).toBeNull();
  expect(
    validatePermissionWindow({ validFrom: "2026-10-06T12:00:00Z", validUntil: null }, now),
  ).toBeNull();
  expect(
    validatePermissionWindow({ validFrom: null, validUntil: "2026-10-05T12:00:00Z" }, now),
  ).toMatch(/futuro/);
  expect(
    validatePermissionWindow(
      { validFrom: "2026-10-06T12:00:00Z", validUntil: "2026-10-05T12:00:00Z" },
      now,
    ),
  ).toMatch(/posterior/);
  expect(validatePermissionWindow({ validFrom: "bad", validUntil: null }, now)).toMatch(/válida/);
  expect(validatePermissionWindow({ validFrom: null, validUntil: "bad" }, now)).toMatch(/válida/);
});
