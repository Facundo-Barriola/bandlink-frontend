"use client";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Notif = {
  idNotification: number;
  type: string;
  title: string | null;
  body: string | null;
  data: any;
  createdAt: string;
  readAt: string | null;
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const unread = items.filter(n => !n.readAt).length;

  async function fetchNotifs() {
    const r = await fetch(`${API}/notifications?limit=20`, { credentials: "include" });
    const j = await r.json();
    if (j?.ok) setItems(j.data);
  }

  async function markAsRead(id: number) {
    await fetch(`${API}/notifications/${id}/read`, { method: "POST", credentials: "include" });
    setItems(prev => prev.map(n => n.idNotification === id ? { ...n, readAt: new Date().toISOString() } : n));
  }

  async function markAllRead() {
    await fetch(`${API}/notifications/read-all`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    setItems(prev => prev.map(n => n.readAt ? n : { ...n, readAt: new Date().toISOString() }));
  }

  useEffect(() => { if (open) fetchNotifs(); }, [open]);

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="relative p-2 rounded-full hover:bg-muted">
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
            <button onClick={markAllRead} className="text-xs underline">Marcar todas como leídas</button>
          </div>

          <ul className="divide-y">
            {items.length === 0 && (
              <li className="p-4 text-sm text-muted-foreground">Sin notificaciones</li>
            )}
            {items.map(n => (
              <li key={n.idNotification}
                  onClick={() => {
                    markAsRead(n.idNotification);
                    // deep-link básico
                    if (n.data?.idEvent) window.location.href = `/events/${n.data.idEvent}`;
                    else if (n.data?.idBooking) window.location.href = `/bookings/${n.data.idBooking}`;
                  }}
                  className={`p-3 cursor-pointer hover:bg-accent ${!n.readAt ? "bg-accent/40" : ""}`}>
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
