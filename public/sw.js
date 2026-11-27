// Coached by ABZ service worker: shows phone notifications and opens the right page when one is tapped.
// It doesn't cache pages, so the app always shows the latest version.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Coached by ABZ", {
      body: data.body || "",
      icon: "/icon/192",
      badge: "/icon/192",
      tag: data.tag,
      renotify: Boolean(data.tag),
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of windows) {
        if (w.url.startsWith(self.location.origin) && "focus" in w) {
          try {
            await w.navigate(url);
          } catch {
            /* not controlled yet: just focus */
          }
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
