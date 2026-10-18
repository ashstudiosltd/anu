/* Build generates public/sw.js with a content-based release identifier. */
const OFFLINE_CACHE = "anu-offline-__PWA_VERSION__";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  // No skipWaiting: let an open conversation finish on its current release.
  event.waitUntil(caches.open(OFFLINE_CACHE).then(async (cache) => {
    const response = await fetch(OFFLINE_URL, { cache: "reload" });
    if (!response.ok) throw new Error("Offline page unavailable");
    await cache.put(OFFLINE_URL, response);
  }));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith("anu-offline-") && key !== OFFLINE_CACHE).map((key) => caches.delete(key)),
  )));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  // Never intercept chat, account/auth, cross-origin, RSC, or asset requests.
  if (request.method !== "GET" || request.mode !== "navigate" || url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth")) return;
  event.respondWith(fetch(request).catch(async () => {
    const fallback = await caches.match(OFFLINE_URL, { cacheName: OFFLINE_CACHE });
    return fallback || new Response("Anu needs an internet connection. Please reconnect and try again.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }));
});
