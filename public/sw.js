self.addEventListener("push", (event) => {
  if (!event.data) return;
  const payload = event.data.json();
  const title = payload.title || "BandLink";
  const body = payload.body || "";
  const data = payload.data || {};
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data,
      icon: "/logo-bandlink.png",
      badge: "/logo-bandlink.png"
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = dataToUrl(event.notification.data); // arma deep-link
  event.waitUntil(clients.openWindow(url));
});
function dataToUrl(d) {
  if (d?.idEvent) return `/events/${d.idEvent}`;
  if (d?.idBooking) return `/bookings/${d.idBooking}`;
  if (d?.chatId) return `/messages/${d.chatId}`;
  return "/";
}

self.addEventListener("push", (event) => {
  const data = (() => {
    try { return event.data?.json() || {}; } catch { return {}; }
  })();

  event.waitUntil((async () => {
    // Mostrar la notificación como siempre
    await self.registration.showNotification(data.title || "BandLink", {
      body: data.body || "",
      data: data.data || {},
      icon: "/icons/icon-192.png",
    });

    // Avisar a las pestañas abiertas que hay novedades
    const clientsList = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
    clientsList.forEach((client) => {
      client.postMessage({ type: "PUSH_NOTIFICATION", payload: data });
    });
  })());
});
