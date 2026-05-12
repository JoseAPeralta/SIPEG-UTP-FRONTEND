type ServiceWorkerRegistrationContext = {
  isDevelopment: boolean;
  isSecureContext: boolean;
  serviceWorker?: ServiceWorkerContainer | undefined;
};

export function shouldRegisterServiceWorker({
  isDevelopment,
  isSecureContext,
  serviceWorker,
}: ServiceWorkerRegistrationContext) {
  return !isDevelopment && isSecureContext && Boolean(serviceWorker);
}

export function registerServiceWorker() {
  const serviceWorker = "serviceWorker" in navigator ? navigator.serviceWorker : undefined;

  if (
    !shouldRegisterServiceWorker({
      isDevelopment: import.meta.env.DEV,
      isSecureContext: window.isSecureContext || window.location.hostname === "localhost",
      serviceWorker,
    })
  ) {
    return;
  }

  window.addEventListener("load", () => {
    void serviceWorker?.register("/sw.js");
  });
}
