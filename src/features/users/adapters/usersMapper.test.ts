import { describe, expect, it } from "vitest";

import { AdminUsersMappingError, mapAdminUser, mapAdminUsersPage } from "./usersMapper";

const unit = { code: "FISC", id: "fisc", name: "Facultad de Ingenieria de Sistemas" };
const career = { code: "SOFTWARE", id: "software", name: "Desarrollo de Software" };

const adminUser = {
  career,
  email: "mariana.rodriguez@example.edu",
  firstName: "Mariana",
  globalRole: "ADMIN",
  id: "user-1",
  identificationNumber: "8-123-456",
  isActive: true,
  lastName: "Rodriguez",
  unit,
};

describe("mapAdminUser", () => {
  it("should map every administrative field", () => {
    expect(mapAdminUser(adminUser)).toEqual(adminUser);
  });

  it("should accept null institutional references", () => {
    expect(mapAdminUser({ ...adminUser, career: null, unit: null })).toMatchObject({
      career: null,
      unit: null,
    });
  });

  it("should reject an unknown global role", () => {
    expect(() => mapAdminUser({ ...adminUser, globalRole: "SUPERVISOR" })).toThrow(
      AdminUsersMappingError,
    );
  });

  it("should reject a non-boolean active flag", () => {
    expect(() => mapAdminUser({ ...adminUser, isActive: "true" })).toThrow(AdminUsersMappingError);
  });

  it("should reject a missing identification number", () => {
    const withoutIdentification: Record<string, unknown> = { ...adminUser };
    delete withoutIdentification["identificationNumber"];

    expect(() => mapAdminUser(withoutIdentification)).toThrow(AdminUsersMappingError);
  });

  it("should reject a malformed organization reference", () => {
    expect(() => mapAdminUser({ ...adminUser, unit: { id: "fisc", name: "Sin codigo" } })).toThrow(
      AdminUsersMappingError,
    );
  });
});

describe("mapAdminUsersPage", () => {
  it("should validate the paginated envelope and keep its metadata", () => {
    const payload = {
      data: { items: [adminUser], limit: 50, page: 1, total: 1, totalPages: 1 },
      message: "ok",
      success: true,
    };

    expect(mapAdminUsersPage(payload)).toEqual({
      items: [adminUser],
      limit: 50,
      page: 1,
      total: 1,
      totalPages: 1,
    });
  });

  it("should reject incomplete pagination metadata", () => {
    const payload = { data: { items: [], page: 1 }, message: "ok", success: true };

    expect(() => mapAdminUsersPage(payload)).toThrow(AdminUsersMappingError);
  });

  it("should reject a failed envelope", () => {
    expect(() => mapAdminUsersPage({ message: "error", success: false })).toThrow(
      AdminUsersMappingError,
    );
  });
});
