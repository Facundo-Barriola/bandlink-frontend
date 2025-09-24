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
