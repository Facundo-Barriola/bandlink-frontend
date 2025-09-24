export async function registerPush(vapidPublicKey: string) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;

  const reg = await navigator.serviceWorker.register("/sw.js");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return null;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  const body = {
    endpoint: sub.endpoint,
    keys: (sub.toJSON() as any).keys,
    userAgent: navigator.userAgent,
  };

  await fetch(`${process.env.NEXT_PUBLIC_API_URL}/push/subscribe`, {
    method: "POST",
    credentials: "include",           
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return sub;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
