const RESERVED_KEYS = new Set(["then", "catch", "finally"]);

/**
 * Creates a stable port whose implementation chunk is loaded on first use.
 *
 * The proxy forwards any string-keyed property as a deferred method, so a port
 * method added after this factory was written stays reachable without editing a
 * method list. Reserved promise keys and symbols are never intercepted: awaiting
 * or inspecting the port must not trigger a load.
 */
export function createDeferredAdapter<T extends object>(loadAdapter: () => Promise<T>): T {
  let adapterPromise: Promise<T> | undefined;

  const load = () => (adapterPromise ??= loadAdapter());

  return new Proxy(Object.create(null), {
    get(_target, property) {
      if (typeof property !== "string" || RESERVED_KEYS.has(property)) {
        return undefined;
      }

      return (...args: unknown[]) =>
        load().then((adapter) => {
          const method = adapter[property as keyof T];

          if (typeof method !== "function") {
            throw new Error(`Deferred adapter method ${property} is unavailable`);
          }

          return Reflect.apply(method, adapter, args) as unknown;
        });
    },
  }) as T;
}
