const CACHE_PREFIX = "sipeg-utp-";
const CACHE_NAME = `${CACHE_PREFIX}v2`;
const APP_SHELL = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-192.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
];
const STATIC_PATH_PREFIXES = ["/assets/", "/icons/"];

function isSensitiveRequest(request, url) {
  return (
    url.pathname === "/api" ||
    url.pathname.startsWith("/api/") ||
    request.headers.has("Authorization")
  );
}

function isStaticRequest(url) {
  return (
    APP_SHELL.includes(url.pathname) ||
    STATIC_PATH_PREFIXES.some((pathPrefix) => url.pathname.startsWith(pathPrefix))
  );
}

function isCacheableResponse(response) {
  const cacheControl = response.headers.get("Cache-Control")?.toLowerCase() ?? "";

  return (
    response.status === 200 &&
    response.type === "basic" &&
    !cacheControl.includes("no-store") &&
    !cacheControl.includes("private")
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (isSensitiveRequest(request, url)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!isCacheableResponse(response)) {
            return response;
          }

          const responseClone = response.clone();

          return caches
            .open(CACHE_NAME)
            .then((cache) => cache.put("/index.html", responseClone))
            .then(() => response);
        })
        .catch(() =>
          caches.match("/index.html").then((cached) => cached || caches.match("/offline.html")),
        ),
    );
    return;
  }

  if (!isStaticRequest(url)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        if (!response || !isCacheableResponse(response)) {
          return response;
        }

        const responseClone = response.clone();

        return caches
          .open(CACHE_NAME)
          .then((cache) => cache.put(request, responseClone))
          .then(() => response);
      });
    }),
  );
});
