/* Inversiones JP · service worker de avisos (Web Push).
   Muestra la notificación aunque la pestaña esté cerrada y, al tocarla, abre o enfoca la página indicada. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch {
    d = { body: event.data ? event.data.text() : "" };
  }
  const titulo = d.title || "Inversiones JP";
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: d.body || "",
      tag: d.tag || "jp-aviso",
      renotify: true,
      icon: "/logo-jp.webp",
      badge: "/logo-jp.webp",
      data: { url: d.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      for (const v of ventanas) {
        if (new URL(v.url).origin === self.location.origin && "focus" in v) {
          return v.navigate(destino).then((w) => (w || v).focus()).catch(() => v.focus());
        }
      }
      return self.clients.openWindow(destino);
    }),
  );
});
