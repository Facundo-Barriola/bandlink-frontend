"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Share2, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Visibility = "public" | "private" | string;

type Address = {
  idAddress: number;
  street?: string | null;
  streetNum?: number | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  postalCode?: string | null;
  description?: string | null;
} | null;

export type EventLite = {
  idEvent: number;
  name: string;
  description: string | null;
  visibility: Visibility;
  capacityMax: number | null;
  idAddress: number | null;
  startsAt: string;   // ISO
  endsAt: string | null;
  address?: Address;
};

function toDayHM(iso: string) {
  const d = new Date(iso);
  const dd = d.toLocaleDateString("es-AR");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${dd} ${hh}:${mm}`;
}

export default function AttendingEventsList() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<EventLite[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    let alive = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API}/events/attending`, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: ac.signal,
        });

        if (res.status === 401 || res.status === 403) {
          if (alive) router.push("/login");
          return;
        }

        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

        const list: EventLite[] = (json?.data?.items ?? json?.data ?? json) as EventLite[];
        if (alive) setItems(Array.isArray(list) ? list : []);
      } catch (e: any) {
        if (alive) setError(e?.message || "No se pudieron cargar tus eventos agendados");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
      ac.abort();
    };
  }, [router]);

  const empty = !loading && items.length === 0;

  async function handleShare(ev: EventLite) {
    const url = `${process.env.NEXT_PUBLIC_CLIENT_URL ?? "http://localhost:3000"}/events/${ev.idEvent}`;
    const title = ev.name;
    const text = `Te comparto este evento: ${ev.name} — ${toDayHM(ev.startsAt)}`;

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        alert("Link copiado al portapapeles ✅");
      } else {
        prompt("Copiá el link del evento:", url);
      }
    } catch {
      /* cancelado o no soportado */
    }
  }

  return (
    <div className="space-y-6">
      {loading && (
        <div className="space-y-3 animate-pulse">
          <div className="h-24 bg-muted/60 rounded-2xl" />
          <div className="h-24 bg-muted/60 rounded-2xl" />
          <div className="h-24 bg-muted/60 rounded-2xl" />
        </div>
      )}

      {error && !loading && (
        <Card className="rounded-2xl">
          <CardContent className="p-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {empty && (
        <Card className="rounded-2xl">
          <CardContent className="p-8 text-sm text-muted-foreground">
            No tenés eventos agendados todavía.
          </CardContent>
        </Card>
      )}

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {items.map((ev) => {
            const visLabel = ev.visibility === "private" ? "Privado" : "Público";
            const addr = ev.address ?? null;
            const addrLine = addr
              ? [addr.street, addr.streetNum, addr.city].filter(Boolean).join(" ")
              : null;

            return (
              <Card key={ev.idEvent} className="rounded-2xl">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-lg font-semibold leading-tight">
                      {ev.name}
                    </CardTitle>
                    <Badge variant={ev.visibility === "private" ? "secondary" : "default"}>
                      {visLabel}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-0">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      <span>{toDayHM(ev.startsAt)}</span>
                    </div>
                    {addrLine && <span className="text-xs">· {addrLine}</span>}
                  </div>

                  {ev.description && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {ev.description}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="rounded-xl"
                      onClick={() => handleShare(ev)}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Compartir
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => router.push(`/events/${ev.idEvent}`)}
                    >
                      Ver
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
