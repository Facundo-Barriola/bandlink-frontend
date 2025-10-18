"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Notif = {
  idNotification: number | null;
  clientKey: string;
  type: string;
  title: string | null;
  body: string | null;
  data: any;
  createdAt: string;
  readAt: string | null;
};

function safeParse(v: any) {
  if (typeof v !== "string") return v ?? {};
  try { return JSON.parse(v); } catch { return {}; }
}
const toNum = (v: any): number | null => {
  const n = typeof v === "string" ? Number.parseInt(v, 10)
    : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const unread = useMemo(() => items.filter(n => !n.readAt).length, [items]);
  const pollingRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function fetchNotifs() {
    try {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const r = await fetch(`${API}/notifications?limit=20`, {
        credentials: "include",
        cache: "no-store",
        signal: ctrl.signal,
        headers: { Accept: "application/json" },
      });
      const j = await r.json().catch(() => ({}));

      const normalized: Notif[] = (j?.data ?? []).map((raw: any, i: number) => {
        const id = toNum(raw.idNotification ?? raw.idnotification ?? raw.id);
        const createdAt = raw.createdAt ?? raw.createdat ?? new Date().toISOString();
        return {
          idNotification: id,
          clientKey: `n-${id ?? `tmp-${i}`}-${createdAt}`,
          type: raw.type ?? "",
          title: raw.title ?? "BandLink",
          body: raw.body ?? null,
          data: safeParse(raw.data),
          createdAt,
          readAt: raw.readAt ?? raw.readat ?? null,
        };
      });

      // dedup por (id, createdAt)
      const uniq = new Map<string, Notif>();
      for (const n of normalized) uniq.set(`${n.idNotification}-${n.createdAt}`, n);
      setItems(Array.from(uniq.values()));
    } catch (e) {
      // silencio: no queremos romper la UI por fallos intermitentes
    }
  }

  async function markAsRead(id: number) {
    try {
      await fetch(`${API}/notifications/${id}/read`, { method: "POST", credentials: "include" });
    } finally {
      setItems(prev => prev.map(n => n.idNotification === id ? { ...n, readAt: new Date().toISOString() } : n));
    }
  }

  async function markAllRead() {
    try {
      await fetch(`${API}/notifications/read-all`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } finally {
      setItems(prev => prev.map(n => n.readAt ? n : ({ ...n, readAt: new Date().toISOString() })));
    }
  }

  // 1) Cargar al montar (al ingresar a la app)
  useEffect(() => {
    fetchNotifs();
    // limpieza de requests en vuelo
    return () => abortRef.current?.abort();
  }, []);

  // 2) Seguir refrescando cuando se abre el popover (opcional)
  useEffect(() => { if (open) fetchNotifs(); }, [open]);

  // 3) Refrescar al volver el foco / pestaña visible
  useEffect(() => {
    const onFocus = () => fetchNotifs();
    const onVis = () => { if (!document.hidden) fetchNotifs(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // 4) Poll suave (cada 30s). Podés subir a 60s si querés menos tráfico.
  useEffect(() => {
    pollingRef.current = window.setInterval(fetchNotifs, 30000);
    return () => { if (pollingRef.current) window.clearInterval(pollingRef.current); };
  }, []);

  // 5) Si tu SW manda postMessage al recibir un push, actualizamos sin esperar
  useEffect(() => {
    const handler = (ev: MessageEvent) => {
      if (ev?.data?.type === "PUSH_NOTIFICATION") fetchNotifs();
    };
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener("message", handler);
      return () => navigator.serviceWorker?.removeEventListener("message", handler);
    }
  }, []);

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="relative p-2 rounded-full hover:bg-muted" aria-label="Notificaciones">
        <Bell className="w-6 h-6" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 rounded-full text-xs flex items-center justify-center bg-red-600 text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[60vh] overflow-auto rounded-xl border bg-background shadow-lg">
          <div className="p-2 flex items-center justify-between border-b">
            <span className="font-medium">Notificaciones</span>
            <button onClick={markAllRead} className="text-xs underline cursor-pointer">Marcar todas como leídas</button>
          </div>

          <ul className="divide-y">
            {items.length === 0 && (
              <li className="p-4 text-sm text-muted-foreground">Sin notificaciones</li>
            )}
            {items.map((n) => (
              <li
                key={n.clientKey}
                onClick={() => {
                  if (n.idNotification != null) markAsRead(n.idNotification);
                  if (n.data?.idEvent) window.location.href = `/events/${n.data.idEvent}`;
                  else if (n.data?.idBooking) window.location.href = `/bookings/${n.data.idBooking}`;
                }}
                className={`p-3 cursor-pointer hover:bg-accent ${!n.readAt ? "bg-accent/40" : ""}`}
              >
                <div className="text-sm font-medium">{n.title ?? "BandLink"}</div>
                {n.body && <div className="text-sm text-muted-foreground">{n.body}</div>}
                <div className="text-[11px] text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
