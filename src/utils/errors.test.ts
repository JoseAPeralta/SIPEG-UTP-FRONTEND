import { describe, expect, it } from "vitest";

import { toError } from "./errors";

describe("toError", () => {
  it("should keep existing errors", () => {
    const error = new Error("fallo");

    expect(toError(error)).toBe(error);
  });

  it("should wrap unknown values with a fallback message", () => {
    expect(toError("boom").message).toBe("No se pudo completar la operacion");
    expect(toError(null, "mensaje propio").message).toBe("mensaje propio");
  });
});
