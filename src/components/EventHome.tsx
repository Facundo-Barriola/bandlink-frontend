"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, MapPin, UserPlusIcon, Users } from "lucide-react";
import EventMapPicker from "@/components/EventMapPicker";
import { InvitePeopleDialog, InviteTarget } from "@/components/InvitePeopleDialog";
import { useUser } from "@/app/context/userContext";
import JoinAsBandDialog, { AdminBand } from "@/components/JoinAsBandDialog";
import { toast } from "sonner";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const API_FALLBACK = "http://localhost:4000";

type Visibility = "public" | "private" | string;

type Address = {
  street?: string;
  streetNum?: number;
  city?: string;
  province?: string;
  country?: string;
  postalCode?: string;
  description?: string | null;
} | null;

type EventData = {
  idEvent: number;
  idUser: number;
  name: string;
  description: string | null;
  visibility: Visibility;
  capacityMax: number | null;
  startsAt: string; // ISO
  endsAt: string | null; // ISO
  idAddress: number | null;
  latitude: number | string | null;
  longitude: number | string | null;
  address?: Address;
};

function toTimeHM(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function toDayDMY(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR");
}

function coordToNum(v: number | string | null | undefined) {
  if (v == null) return null;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? (n as number) : null;
}

// --- Mapa solo-lectura con un marcador centrado ---
function EventStaticMap({ lat, lon }: { lat: number; lon: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const center: [number, number] = [lon, lat];
    const map = new mapboxgl.Map({
      container: ref.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center,
      zoom: 13,
    });

    const marker = new mapboxgl.Marker({ color: "#65558F" }).setLngLat(center).addTo(map);

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      marker.remove();
      map.remove();
    };
  }, [lat, lon]);

  return <div ref={ref} className="w-full h-[280px] rounded-2xl overflow-hidden" />;
}

export default function EventHome() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);
  const [picked, setPicked] = useState<{ lat: number; lon: number } | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const { user } = useUser();
  const [showJoinBand, setShowJoinBand] = useState(false);

  const API = useMemo(() => process.env.NEXT_PUBLIC_API_URL || API_FALLBACK, []);
  const idEvent = useMemo(() => {
    const raw = params?.id;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<EventData | null>(null);

  async function handleInvite(target: InviteTarget) {
    try {
      const res = await fetch(`${API}/events/${event!.idEvent}/invites`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(target),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      toast.success(`Invitación enviada a ${target.label}`);
      setShowInvite(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "No se pudo enviar la invitación");
    }
  }

  async function handleAttend() {
    if (!event) return;
    try {
      const res = await fetch(`${API}/events/${event.idEvent}/attendees`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      toast.success("Te uniste al evento");
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (msg.includes("creator_cannot_attend")) {
        toast.error("No podés agendar tu propio evento.");
      } else if (msg.includes("capacity_full")) {
        toast.error("El evento alcanzó su capacidad máxima.");
      } else {
        toast.error("No se pudo agendarte al evento.");
      }
    }
  }

  async function handleJoinAsBand() {
    if (!event) return;
    setShowJoinBand(true);
  }

  useEffect(() => {
    if (idEvent == null) return;

    let alive = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(`${API}/events/${idEvent}`, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        let json: any = {};
        try {
          json = await res.json();
        } catch {}
        if (!res.ok) {
          const msg = json?.error || `HTTP ${res.status}`;
          throw new Error(msg);
        }
        const data: EventData = (json?.data ?? json) as EventData;
        if (alive) setEvent(data);
      } catch (err: any) {
        if (alive) setError(err?.message || "No se pudo cargar el evento");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [API, idEvent]);

  // --- UI estados
  if (!idEvent) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card className="rounded-2xl">
          <CardContent className="p-6 space-y-2">
            <p className="text-sm text-muted-foreground">ID de evento inválido.</p>
            <Button variant="secondary" onClick={() => router.push("/discover")}>Volver</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-8 animate-pulse">
        <div className="h-28 bg-muted rounded-2xl mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 h-64 bg-muted rounded-2xl" />
          <div className="h-64 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card className="rounded-2xl">
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-destructive">{error || "No se encontró el evento."}</p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => router.back()}>Volver</Button>
              <Button onClick={() => router.push(`/events/${idEvent}`)}>Reintentar</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const startDay = toDayDMY(event.startsAt);
  const startHM = toTimeHM(event.startsAt);
  const endHM = toTimeHM(event.endsAt || undefined);

  const lat = coordToNum(event.latitude);
  const lon = coordToNum(event.longitude);

  const visLabel = event.visibility === "private" ? "Privado" : "Público";

  const addr = event.address || null;
  const addrLine = addr ? [addr.street, addr.streetNum, addr.city].filter(Boolean).join(" ") : null;
  const addrDetail = addr ? [addr.province, addr.country, addr.postalCode].filter(Boolean).join(", ") : null;

  const coordsLine = lat != null && lon != null ? `${lat.toFixed(6)}, ${lon.toFixed(6)}` : null;
  const isCreator = user?.idUser && event?.idUser && user.idUser === event.idUser;

  return (
    <div className="w-full max-w-6xl mx-auto p-6 md:p-8 space-y-6">
      {/* Header */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6 justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-semibold leading-tight text-[#65558F]">{event.name}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge className="bg-[#65558F]/10 text-[#65558F] border border-[#65558F]/20">{visLabel}</Badge>
                {typeof event.capacityMax === "number" && (
                  <span className="inline-flex items-center text-muted-foreground">
                    <Users className="h-4 w-4 mr-1.5" /> Capacidad: {event.capacityMax}
                  </span>
                )}
              </div>
            </div>

            {!isCreator && (
              <div className="flex gap-2">
                <Button
                  size="lg"
                  className="rounded-2xl bg-[#65558F] text-white hover:bg-[#5a4d82] shadow-sm"
                  onClick={handleAttend}
                >
                  Agendar / Unirme
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  className="rounded-2xl"
                  onClick={handleJoinAsBand}
                  title="Solo admins de banda"
                >
                  Banda
                </Button>
              </div>
            )}
          </div>

          {event.description && (
            <p className="mt-3 text-sm md:text-base leading-relaxed text-foreground/80 whitespace-pre-wrap">
              {event.description}
            </p>
          )}

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /><span>{startDay}{startHM ? ` — ${startHM}` : ""}{endHM ? ` a ${endHM}` : ""}</span></div>
            <div className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5" /><div>
              {addrLine && <div>{addrLine}</div>}
              {addrDetail && <div className="text-xs">{addrDetail}</div>}
              {!addrLine && coordsLine && <div>Coords: {coordsLine}</div>}
              {!addrLine && !coordsLine && <div className="italic">Ubicación sin definir</div>}
            </div></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda */}
        <div className="lg:col-span-2 space-y-6">
          {/* Mapa - si hay coords, mostrarlo siempre. Además, permitir fijar/editar si el creador lo desea */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="p-6 pb-3">
              <CardTitle className="text-base">Ubicación</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              {showPicker ? (
                <div className="space-y-4">
                  <EventMapPicker
                    initialLat={lat ?? undefined}
                    initialLon={lon ?? undefined}
                    onPick={(newLat, newLon) => setPicked({ lat: newLat, lon: newLon })}
                  />
                  <div className="text-sm">Seleccionado: <b>{picked ? `${picked.lat.toFixed(6)}, ${picked.lon.toFixed(6)}` : "—"}</b></div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="lg"
                      className="rounded-2xl bg-[#65558F] text-white hover:bg-[#5a4d82]"
                      disabled={!picked}
                      onClick={async () => {
                        if (!picked) return;
                        const res = await fetch(`${API}/events/${event.idEvent}/location`, {
                          method: "PUT",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ idEvent: event.idEvent, latitude: picked.lat, longitude: picked.lon }),
                        });
                        const json = await res.json().catch(() => ({}));
                        if (!res.ok) {
                          console.error(json);
                          toast.error(json?.error || "No se pudo guardar la ubicación");
                          return;
                        }
                        setEvent((prev) => (prev ? { ...prev, latitude: picked.lat, longitude: picked.lon } : prev));
                        toast.success("Ubicación guardada");
                        setShowPicker(false);
                      }}
                    >
                      Guardar ubicación
                    </Button>
                    <Button type="button" variant="secondary" size="lg" className="rounded-2xl" onClick={() => setShowPicker(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : lat != null && lon != null ? (
                <EventStaticMap lat={lat} lon={lon} />
              ) : (
                <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No hay coordenadas cargadas.
                  {isCreator && (
                    <div className="mt-3">
                      <Button variant="outline" className="rounded-2xl" onClick={() => setShowPicker(true)}>
                        <MapPin className="mr-2 h-4 w-4" /> Fijar ubicación en mapa
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {lat != null && lon != null && isCreator && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="rounded-2xl" onClick={() => setShowPicker(true)}>
                    Editar ubicación
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha (acciones) */}
        <div className="lg:col-span-1">
          <Card className="rounded-2xl shadow-sm sticky top-6">
            <CardHeader className="p-6 pb-3">
              <CardTitle className="text-base">Acciones</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-2 space-y-3">
              {/* Toggle picker siempre visible para el creador */}
              {isCreator && (
                <Button type="button" variant="outline" size="lg" className="w-full rounded-2xl justify-start" onClick={() => setShowPicker((v) => !v)}>
                  <MapPin className="mr-2 h-4 w-4" /> {showPicker ? "Ocultar mapa" : lat && lon ? "Editar ubicación" : "Fijar ubicación en mapa"}
                </Button>
              )}

              {isCreator ? (
                <>
                  <Button type="button" variant="outline" size="lg" className="w-full rounded-2xl justify-start" onClick={() => setShowInvite(true)}>
                    <Users className="mr-2 h-4 w-4" /> Invitar músicos o bandas
                  </Button>
                  <p className="text-xs text-muted-foreground">Sos el creador del evento. No podés agendar tu propio evento.</p>
                </>
              ) : (
                <>
                  <Button type="button" size="lg" className="w-full rounded-2xl bg-[#65558F] text-white hover:bg-[#5a4d82] shadow-sm" onClick={handleAttend}>
                    <UserPlusIcon className="mr-2 h-4 w-4" /> Asistir
                  </Button>
                  <Button type="button" variant="secondary" size="lg" className="w-full rounded-2xl" onClick={() => setShowJoinBand(true)}>
                    Unirse como banda (admin)
                  </Button>
                </>
              )}

              <InvitePeopleDialog open={showInvite} onOpenChange={setShowInvite} onInvite={handleInvite} />
            </CardContent>

            <JoinAsBandDialog
              open={showJoinBand}
              onOpenChange={setShowJoinBand}
              idUser={user?.idUser}
              onSelect={async (band: AdminBand) => {
                try {
                  const res = await fetch(`${API}/events/${event.idEvent}/bands/join`, {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json", Accept: "application/json" },
                    body: JSON.stringify({ idBand: band.idBand }),
                  });
                  const json = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
                  setShowJoinBand(false);
                  toast.success(`Solicitud enviada como "${band.name}"`);
                } catch (e: any) {
                  const msg = String(e?.message || "");
                  if (msg.includes("not_band_admin")) {
                    toast.error("Solo el administrador de la banda puede unirse al evento.");
                  } else {
                    toast.error("No se pudo enviar la solicitud de banda.");
                  }
                }
              }}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
