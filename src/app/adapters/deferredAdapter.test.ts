// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { createDeferredAdapter } from "./deferredAdapter";

type ExampleAdapter = {
  addedLater: () => Promise<string>;
  load: (id: string) => Promise<string>;
  save: (value: string) => Promise<number>;
};

describe("createDeferredAdapter", () => {
  it("loads the real adapter only when a method is called", async () => {
    const loadAdapter = vi.fn((): Promise<ExampleAdapter> =>
      Promise.resolve({
        addedLater: () => Promise.resolve("added"),
        load: (id) => Promise.resolve(`loaded:${id}`),
        save: (value) => Promise.resolve(value.length),
      }),
    );
    const adapter = createDeferredAdapter(loadAdapter);

    expect(loadAdapter).not.toHaveBeenCalled();
    await expect(adapter.load("activity-1")).resolves.toBe("loaded:activity-1");
    expect(loadAdapter).toHaveBeenCalledOnce();
  });

  it("shares one adapter instance across deferred methods", async () => {
    const loadAdapter = vi.fn((): Promise<ExampleAdapter> =>
      Promise.resolve({
        addedLater: () => Promise.resolve("added"),
        load: (id) => Promise.resolve(id),
        save: (value) => Promise.resolve(value.length),
      }),
    );
    const adapter = createDeferredAdapter(loadAdapter);

    await Promise.all([adapter.load("activity-1"), adapter.save("SIPEG")]);

    expect(loadAdapter).toHaveBeenCalledOnce();
  });

  it("forwards a port method added after the adapter was created", async () => {
    const adapter = createDeferredAdapter((): Promise<ExampleAdapter> =>
      Promise.resolve({
        addedLater: () => Promise.resolve("added"),
        load: (id) => Promise.resolve(id),
        save: (value) => Promise.resolve(value.length),
      }),
    );

    await expect(adapter.addedLater()).resolves.toBe("added");
  });

  it("reports a method the loaded adapter does not implement", async () => {
    const adapter = createDeferredAdapter((): Promise<ExampleAdapter> =>
      Promise.resolve({ load: (id: string) => Promise.resolve(id) } as ExampleAdapter),
    );

    await expect(adapter.save("SIPEG")).rejects.toThrow(/save/);
  });

  it("does not hijack then when the adapter is awaited", async () => {
    const loadAdapter = vi.fn((): Promise<ExampleAdapter> =>
      Promise.resolve({
        addedLater: () => Promise.resolve("added"),
        load: (id) => Promise.resolve(id),
        save: (value) => Promise.resolve(value.length),
      }),
    );
    const adapter = createDeferredAdapter(loadAdapter);

    await expect(Promise.resolve(adapter)).resolves.toBe(adapter);
    expect(loadAdapter).not.toHaveBeenCalled();
  });
});
