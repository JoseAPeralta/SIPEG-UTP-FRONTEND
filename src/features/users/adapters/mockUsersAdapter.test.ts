import { describe, expect, it } from "vitest";

import { users } from "@/data/mock/users";

import { createMockUsersAdapter } from "./mockUsersAdapter";

describe("createMockUsersAdapter", () => {
  it("should resolve a defensive copy of the seeded users", async () => {
    const adapter = createMockUsersAdapter();

    const first = await adapter.loadUsers();
    const second = await adapter.loadUsers();

    expect(first).toEqual(users);
    expect(first).not.toBe(users);
    expect(first[0]).not.toBe(users[0]);
    expect(second).toEqual(first);
  });
});
