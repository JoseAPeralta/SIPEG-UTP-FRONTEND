// @vitest-environment node

import { describe, expect, it } from "vitest";

import { createAlert, createAlertsPage } from "@/test/factories";

import { applyAlertRead } from "./alertReadUpdates";

const unreadPage = createAlertsPage({
  items: [createAlert({ id: "a", isRead: false }), createAlert({ id: "b", isRead: false })],
  page: 2,
  total: 21,
  totalPages: 2,
});

describe("applyAlertRead", () => {
  it("should remove the alert from an unread page and shrink the total", () => {
    const next = applyAlertRead(
      unreadPage,
      { isRead: false },
      {
        alertId: "a",
        kind: "one",
        wasUnread: true,
      },
    );

    expect(next.items.map((alert) => alert.id)).toEqual(["b"]);
    expect(next.total).toBe(20);
    expect(next.totalPages).toBe(1);
  });

  it("should shrink the unread total even when the alert lives on another page", () => {
    const next = applyAlertRead(
      unreadPage,
      { isRead: false },
      {
        alertId: "z",
        kind: "one",
        wasUnread: true,
      },
    );

    expect(next.items).toHaveLength(2);
    expect(next.total).toBe(20);
  });

  it("should leave an unread page untouched when the alert was already read", () => {
    const next = applyAlertRead(
      unreadPage,
      { isRead: false },
      {
        alertId: "a",
        kind: "one",
        wasUnread: false,
      },
    );

    expect(next).toBe(unreadPage);
  });

  it("should flag the alert as read on a page without a read filter", () => {
    const page = createAlertsPage({ items: [createAlert({ id: "a", isRead: false })] });
    const next = applyAlertRead(page, {}, { alertId: "a", kind: "one", wasUnread: true });

    expect(next.items[0]!.isRead).toBe(true);
    expect(next.total).toBe(page.total);
  });

  it("should never touch read-only pages nor consistent pages", () => {
    const readPage = createAlertsPage({ items: [createAlert({ isRead: true })] });

    expect(
      applyAlertRead(readPage, { isRead: true }, { alertId: "a", kind: "one", wasUnread: true }),
    ).toBe(readPage);

    const alreadyRead = createAlertsPage({ items: [createAlert({ id: "a", isRead: true })] });
    expect(applyAlertRead(alreadyRead, {}, { alertId: "a", kind: "one", wasUnread: true })).toBe(
      alreadyRead,
    );
  });

  it("should empty every unread page when marking all and respect the filter", () => {
    const next = applyAlertRead(unreadPage, { isRead: false }, { kind: "all" });

    expect(next.items).toEqual([]);
    expect(next.total).toBe(0);
    expect(next.totalPages).toBe(1);

    const allPage = createAlertsPage({
      items: [createAlert({ id: "a", isRead: false }), createAlert({ id: "b", isRead: true })],
    });
    const marked = applyAlertRead(allPage, {}, { kind: "all" });

    expect(marked.items.every((alert) => alert.isRead)).toBe(true);
  });

  it("should not touch a read-only page nor an already empty unread page", () => {
    const readPage = createAlertsPage({ items: [createAlert({ isRead: true })] });

    expect(applyAlertRead(readPage, { isRead: true }, { kind: "all" })).toBe(readPage);

    const emptyUnread = createAlertsPage({ items: [], total: 0, totalPages: 1 });
    expect(applyAlertRead(emptyUnread, { isRead: false }, { kind: "all" })).toBe(emptyUnread);
  });
});
