// @vitest-environment node

import { describe, expect, it } from "vitest";

import { SESSION_END_MESSAGES } from "./sessionEnd";

describe("SESSION_END_MESSAGES", () => {
  it("should publish a message for every session end reason", () => {
    const reasons = ["expired", "throttled", "unavailable"] as const;

    expect(reasons.every((reason) => SESSION_END_MESSAGES[reason].trim().length > 0)).toBe(true);
  });

  it("should never state a cause the contract cannot confirm", () => {
    const messages = Object.values(SESSION_END_MESSAGES).join(" ");

    expect(messages).not.toMatch(/inactiv|desactiv|verificad|revocad|bloquead/i);
  });
});
