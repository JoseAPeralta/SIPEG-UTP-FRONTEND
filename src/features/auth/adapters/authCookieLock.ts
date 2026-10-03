/** Serializa mutaciones de la cookie entre pestanas del mismo origen frontend. */
export function withAuthCookieLock<T>(apiOrigin: string, operation: () => Promise<T>): Promise<T> {
  const locks =
    typeof navigator === "undefined" ? undefined : (navigator as Partial<Navigator>).locks;
  if (locks) {
    return locks.request(`sipeg-auth-cookie:${apiOrigin}`, operation);
  }

  return operation();
}

export function hasAuthCookieLock(): boolean {
  return typeof navigator !== "undefined" && !!navigator.locks;
}
