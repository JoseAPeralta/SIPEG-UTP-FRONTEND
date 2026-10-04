import { describe, expect, it } from "vitest";

import { createMockUsersAdapter } from "./mockUsersAdapter";

function adapter() {
  return createMockUsersAdapter();
}

describe("createMockUsersAdapter listing", () => {
  it("should return the whole catalog when no filter is present", async () => {
    const page = await adapter().loadUsersPage!({}, 1);

    expect(page.total).toBe(5);
    expect(page.items).toHaveLength(5);
    expect(page.page).toBe(1);
  });

  it("should filter by role, status, search, unit and career with AND semantics", async () => {
    const users = adapter();

    const admins = await users.loadUsersPage!({ globalRole: "ADMIN" }, 1);
    expect(admins.items.map((item) => item.id)).toEqual(["user-1"]);

    const inactive = await users.loadUsersPage!({ isActive: false }, 1);
    expect(inactive.items.map((item) => item.id)).toEqual(["user-5"]);

    const search = await users.loadUsersPage!({ q: "carlos" }, 1);
    expect(search.items.map((item) => item.id)).toEqual(["user-2"]);

    const byIdentification = await users.loadUsersPage!({ q: "8-655-9021" }, 1);
    expect(byIdentification.items.map((item) => item.id)).toEqual(["user-3"]);

    const byUnitAndCareer = await users.loadUsersPage!({ careerId: "software", unitId: "fisc" }, 1);
    expect(byUnitAndCareer.items.map((item) => item.id)).toEqual(["user-1"]);
  });

  it("should load one user and reject an unknown id", async () => {
    const users = adapter();

    await expect(users.getUser!("user-2")).resolves.toMatchObject({
      id: "user-2",
      lastName: "Mendez",
    });
    await expect(users.getUser!("missing")).rejects.toMatchObject({ status: 404 });
  });
});

describe("createMockUsersAdapter commands", () => {
  it("should create an active USER with resolved references", async () => {
    const users = adapter();

    const created = await users.createUser!({
      careerId: "cybersecurity",
      email: "nuevo@example.edu",
      firstName: "Nuevo",
      identificationNumber: "8-111-2222",
      lastName: "Ingreso",
      password: "contrasena-larga",
      unitId: "fisc",
    });

    expect(created).toMatchObject({
      career: { id: "cybersecurity", name: "Ciberseguridad" },
      email: "nuevo@example.edu",
      globalRole: "USER",
      isActive: true,
      unit: { id: "fisc" },
    });

    const page = await users.loadUsersPage!({ q: "nuevo@example.edu" }, 1);
    expect(page.items).toHaveLength(1);
  });

  it("should reject a duplicate email or identification number", async () => {
    const users = adapter();

    await expect(
      users.createUser!({
        email: "mariana.rodriguez@example.edu",
        firstName: "Otra",
        identificationNumber: "8-000-1111",
        lastName: "Cuenta",
        password: "contrasena-larga",
        unitId: null,
      }),
    ).rejects.toMatchObject({ status: 409 });

    await expect(
      users.createUser!({
        email: "otra@example.edu",
        firstName: "Otra",
        identificationNumber: "8-888-1234",
        lastName: "Cuenta",
        password: "contrasena-larga",
        unitId: null,
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("should reject an invalid unit or a career outside the unit", async () => {
    const users = adapter();

    await expect(
      users.createUser!({
        email: "otra@example.edu",
        firstName: "Otra",
        identificationNumber: "8-000-1111",
        lastName: "Cuenta",
        password: "contrasena-larga",
        unitId: "inexistente",
      }),
    ).rejects.toMatchObject({ status: 400 });

    await expect(
      users.createUser!({
        careerId: "software",
        email: "otra@example.edu",
        firstName: "Otra",
        identificationNumber: "8-000-1111",
        lastName: "Cuenta",
        password: "contrasena-larga",
        unitId: "fic",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("should protect the acting administrator and the last active administrator", async () => {
    const users = adapter();

    await expect(users.updateUser!("user-1", { isActive: false })).rejects.toMatchObject({
      status: 409,
    });
    await expect(users.updateUser!("user-1", { globalRole: "USER" })).rejects.toMatchObject({
      status: 409,
    });
  });

  it("should reject promoting an inactive account or combining promotion with deactivation", async () => {
    const users = adapter();

    await expect(users.updateUser!("user-5", { globalRole: "ADMIN" })).rejects.toMatchObject({
      status: 409,
    });
    await expect(
      users.updateUser!("user-2", { globalRole: "ADMIN", isActive: false }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("should force the global Otros career when the unit is cleared", async () => {
    const users = adapter();

    const updated = await users.updateUser!("user-1", { unitId: null });

    expect(updated.unit).toBeNull();
    expect(updated.career).toEqual({ code: "OTROS", id: "otros", name: "Otros" });
  });

  it("should reject a career that does not belong to the selected unit", async () => {
    const users = adapter();

    await expect(
      users.updateUser!("user-2", { careerId: "software", unitId: "fic" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("should apply a safe role change", async () => {
    const users = adapter();

    const updated = await users.updateUser!("user-2", { globalRole: "ADMIN" });

    expect(updated.globalRole).toBe("ADMIN");
    expect(updated.isActive).toBe(true);
  });
});
