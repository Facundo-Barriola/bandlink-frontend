"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Share2, Trash2, CalendarDays } from "lucide-react";
import { useUser } from "@/app/context/userContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EditEventDialog from "@/components/EditEventDialog";
import AttendingEventsList from "@/components/AttendingEventsList";

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

type EventLite = {
  idEvent: number;
  name: string;
  description: string | null;
  visibility: Visibility;
  capacityMax: number | null;
  idAddress: number | null;
  startsAt: string;   // ISO
  endsAt: string | null;
  address?: Address;  // si el back ya la incluye
};

function toDayHM(iso: string) {
  const d = new Date(iso);
  const dd = d.toLocaleDateString("es-AR");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${dd} ${hh}:${mm}`;
}

export default function MyEventsList() {
  const { user } = useUser();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<EventLite[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadMyEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/events/myEvents`, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (res.status === 401 || res.status === 403) {
        router.push("/login");
        return;
      }

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

      const list: EventLite[] = (json?.data?.items ?? json?.data ?? json) as EventLite[];
      setItems(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar tus eventos");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadMyEvents();
  }, [loadMyEvents]);

  const empty = !loading && items.length === 0;

  async function handleDelete(idEvent: number) {
    const ok = confirm("¿Eliminar este evento? Esta acción no se puede deshacer.");
    if (!ok) return;

    try {
      const res = await fetch(`${API}/events/${idEvent}`, {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

      setItems((prev) => prev.filter((e) => e.idEvent !== idEvent));
      alert("Evento eliminado ✅");
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "No se pudo eliminar el evento");
    }
  }

  async function handleShare(ev: EventLite) {
    const url = `${process.env.NEXT_PUBLIC_CLIENT_URL ?? "http://localhost:3000"}/events/${ev.idEvent}`;
    const title = ev.name;
    const text = `Te comparto mi evento: ${ev.name} — ${toDayHM(ev.startsAt)}`;

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
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      <Tabs defaultValue="mine" className="space-y-6">
        <TabsList
          className="
            bg-[#F4F1FB]
            border border-[#E8E1FF]
            rounded-2xl p-1
            shadow-sm
          "
        >
          <TabsTrigger
            value="mine"
            className="
              rounded-xl px-4 py-2 text-sm
              text-[#65558F]/75
              data-[state=active]:bg-[#65558F]
              data-[state=active]:text-white
              data-[state=active]:shadow
              transition-colors
            "
          >
            Creados por mí
          </TabsTrigger>
          <TabsTrigger
            value="attending"
            className="
              rounded-xl px-4 py-2 text-sm
              text-[#65558F]/75
              data-[state=active]:bg-[#65558F]
              data-[state=active]:text-white
              data-[state=active]:shadow
              transition-colors
            "
          >
            Voy a asistir
          </TabsTrigger>
        </TabsList>

        {/* TAB: Mis eventos */}
        <TabsContent value="mine" className="space-y-6">
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
                No tenés eventos creados todavía. ¡Creá el primero!
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
                        <EditEventDialog
                          eventId={ev.idEvent}
                          onUpdated={(updated) => {
                            console.log("Evento actualizado", updated);
                            loadMyEvents();
                          }}
                          trigger={
                            <Button
                              variant="outline"
                              size="sm"
                              className="
                                rounded-xl
                                border-[#C8BEEA]
                                text-[#65558F]
                                hover:bg-[#65558F]
                                hover:text-white
                              "
                            >
                              Editar
                            </Button>
                          }
                        />

                        <Button
                          variant="destructive"
                          size="sm"
                          className="rounded-xl"
                          onClick={() => handleDelete(ev.idEvent)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </Button>

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
        </TabsContent>

        {/* TAB: Voy a asistir */}
        <TabsContent value="attending">
          <AttendingEventsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
