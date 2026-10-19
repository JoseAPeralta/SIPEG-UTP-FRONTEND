// @vitest-environment node

import { describe, expect, it } from "vitest";

import { createMockAlertsAdapter } from "./mockAlertsAdapter";

function adapter(readUserId?: () => string | undefined) {
  return readUserId ? createMockAlertsAdapter(readUserId) : createMockAlertsAdapter();
}

describe("createMockAlertsAdapter", () => {
  it("should return the demo inbox most recent first", async () => {
    const page = await adapter().loadAlertsPage({}, 1);

    expect(page.total).toBeGreaterThan(0);
    expect(page.items.map((alert) => alert.createdAt)).toEqual(
      [...page.items]
        .map((alert) => alert.createdAt)
        .sort()
        .reverse(),
    );
    expect(page.limit).toBe(20);
    expect(page.page).toBe(1);
  });

  it("should filter by read state and type with AND semantics", async () => {
    const inbox = adapter();

    const unread = await inbox.loadAlertsPage({ isRead: false }, 1);
    expect(unread.items.length).toBeGreaterThan(0);
    expect(unread.items.every((alert) => !alert.isRead)).toBe(true);

    const certificates = await inbox.loadAlertsPage({ type: "CERTIFICATE_ISSUED" }, 1);
    expect(certificates.items.length).toBeGreaterThan(0);
    expect(certificates.items.every((alert) => alert.type === "CERTIFICATE_ISSUED")).toBe(true);

    const unreadCertificates = await inbox.loadAlertsPage(
      { isRead: false, type: "CERTIFICATE_ISSUED" },
      1,
    );
    expect(
      unreadCertificates.items.every(
        (alert) => !alert.isRead && alert.type === "CERTIFICATE_ISSUED",
      ),
    ).toBe(true);
  });

  it("should never expose the demo inbox to another identity", async () => {
    const page = await adapter(() => "user-2").loadAlertsPage({}, 1);

    expect(page.items).toEqual([]);
    expect(page.total).toBe(0);
  });

  it("should return clones so callers cannot mutate the fixture", async () => {
    const inbox = adapter();
    const first = await inbox.loadAlertsPage({}, 1);
    const original = first.items[0]!.isRead;

    first.items[0]!.isRead = !original;

    const second = await inbox.loadAlertsPage({}, 1);
    expect(second.items[0]!.isRead).toBe(original);
  });

  it("should flip one alert to read, idempotently and only for the owner", async () => {
    const inbox = adapter();
    const page = await inbox.loadAlertsPage({ isRead: false }, 1);
    const unread = page.items[0]!;

    await expect(inbox.markAlertRead(unread.id)).resolves.toMatchObject({
      id: unread.id,
      isRead: true,
    });
    await expect(inbox.markAlertRead(unread.id)).resolves.toMatchObject({ isRead: true });

    const after = await inbox.loadAlertsPage({ isRead: false }, 1);
    expect(after.items.some((alert) => alert.id === unread.id)).toBe(false);
    expect(after.total).toBe(page.total - 1);
  });

  it("should reject a missing alert without leaking another identity inbox", async () => {
    const otherIdentity = adapter(() => "user-2");
    const before = await adapter().loadAlertsPage({}, 1);

    await expect(otherIdentity.markAlertRead(before.items[0]!.id)).rejects.toMatchObject({
      status: 404,
    });
    await expect(otherIdentity.markAlertRead("missing")).rejects.toMatchObject({ status: 404 });
  });

  it("should mark every unread alert once and report the real count", async () => {
    const inbox = adapter();
    const before = await inbox.loadAlertsPage({ isRead: false }, 1);

    await expect(inbox.markAllAlertsRead()).resolves.toEqual({ updatedCount: before.total });
    await expect(inbox.markAllAlertsRead()).resolves.toEqual({ updatedCount: 0 });

    const after = await inbox.loadAlertsPage({ isRead: false }, 1);
    expect(after.items).toEqual([]);
    expect(after.total).toBe(0);
  });

  it("should not mark a single alert for another identity but keep read-all a no-op", async () => {
    const otherIdentity = adapter(() => "user-2");

    await expect(otherIdentity.markAllAlertsRead()).resolves.toEqual({ updatedCount: 0 });
    await expect(otherIdentity.loadAlertsPage({ isRead: false }, 1)).resolves.toMatchObject({
      total: 0,
    });
  });
});
