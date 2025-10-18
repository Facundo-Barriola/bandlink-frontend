"use client";

import { useEffect, useState, useMemo } from "react";
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

/** Mostrar solo próximos u ONGOING:
 * si hay endsAt: visible si now <= endsAt
 * si NO hay endsAt: visible si now <= startsAt
 */
function filterUpcoming(list: EventLite[]) {
  const now = Date.now();
  return list.filter((ev) => {
    const start = new Date(ev.startsAt).getTime();
    const end = ev.endsAt ? new Date(ev.endsAt).getTime() : start;
    return end >= now;
  });
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

  // ⛳ Derivamos los visibles (sin pasados)
  const visibleItems = useMemo(() => filterUpcoming(items), [items]);
  const empty = !loading && visibleItems.length === 0;

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
        <div className="space-y-3">
          <div className="h-24 bg-[#F4F1FB] rounded-2xl border border-[#E8E1FF] animate-pulse" />
          <div className="h-24 bg-[#F4F1FB] rounded-2xl border border-[#E8E1FF] animate-pulse" />
          <div className="h-24 bg-[#F4F1FB] rounded-2xl border border-[#E8E1FF] animate-pulse" />
        </div>
      )}

      {error && !loading && (
        <Card className="rounded-2xl border border-red-200/70 bg-red-50/60">
          <CardContent className="p-6 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      {empty && (
        <Card className="rounded-2xl border border-dashed border-[#CBB8FF] bg-[#F8F6FF]">
          <CardContent className="p-8 text-sm text-[#65558F]">
            No tenés eventos agendados próximos.
          </CardContent>
        </Card>
      )}

      {!loading && visibleItems.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {visibleItems.map((ev) => {
            const visLabel = ev.visibility === "private" ? "Privado" : "Público";
            const addr = ev.address ?? null;
            const addrLine = addr
              ? [addr.street, addr.streetNum, addr.city].filter(Boolean).join(" ")
              : null;

            return (
              <Card
                key={ev.idEvent}
                className="
                  rounded-2xl
                  border border-[#E9E6F7]
                  hover:shadow-md transition-shadow
                  bg-white
                "
              >
                <CardHeader className="p-4 pb-2 border-b border-[#F0ECFF]">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-lg font-semibold leading-tight text-[#2A2140]">
                      {ev.name}
                    </CardTitle>
                    <Badge
                      className={
                        ev.visibility === "private"
                          ? "bg-[#EDE9FE] text-[#5B21B6] border border-[#DDD6FE]"
                          : "bg-[#E9E6F7] text-[#65558F] border border-[#DAD4F0]"
                      }
                    >
                      {visLabel}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-3">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-[#5A5470]">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-[#65558F]" />
                      <span className="font-medium text-[#3A2E5E]">{toDayHM(ev.startsAt)}</span>
                    </div>
                    {addrLine && (
                      <span className="text-xs text-[#6D5FA4] bg-[#F4F1FB] border border-[#E8E1FF] px-2 py-0.5 rounded-full">
                        {addrLine}
                      </span>
                    )}
                  </div>

                  {ev.description && (
                    <p className="mt-2 text-sm text-[#5A5470]">
                      {ev.description}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="
                        rounded-xl
                        bg-[#F0ECFF] text-[#4F3D8B]
                        hover:bg-[#E6DEFF]
                        border border-[#DDD3FF]
                      "
                      onClick={() => handleShare(ev)}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Compartir
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      className="
                        rounded-xl
                        bg-[#65558F] text-white
                        hover:bg-[#57497B]
                      "
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
