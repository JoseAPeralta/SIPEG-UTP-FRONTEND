export {};

const [{ createApiAuthAdapter }, { createSessionCoordinator }] = await Promise.all([
  import("../src/features/auth/adapters/apiAuthAdapter"),
  import("../src/features/auth/model/authSession"),
]);

const adapter = createApiAuthAdapter({
  environment: { DEV: true, PROD: false, VITE_API_BASE_URL: location.origin },
});
const coordinator = createSessionCoordinator(adapter);
const messages: unknown[] = [];
// Observer only: the coordinator creates and uses its own native channel.
const observer = new BroadcastChannel("sipeg-auth");
observer.onmessage = (event: MessageEvent<unknown>) => messages.push(event.data);
coordinator.subscribe((session) => {
  document.querySelector("#identity")!.textContent = session?.currentUser.email ?? "anónimo";
});

const harness = {
  coordinator,
  messages,
  login: (email: string) => coordinator.establish({ email, password: "fixture-only" }),
  logout: async () => {
    await adapter.logout();
    coordinator.end();
  },
  releaseLock: (): void => {
    throw new Error("No hay un Web Lock retenido por la prueba");
  },
  renewal: Promise.resolve(),
};

declare global {
  // Window augmentation requires declaration merging.
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    authHarness: typeof harness;
  }
}

window.authHarness = harness;
window.addEventListener("pagehide", () => {
  coordinator.dispose();
  observer.close();
});
