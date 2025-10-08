"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/app/context/userContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AvatarEditable } from "@/components/ui/AvatarEditable";
import { CalendarDays, MapPin, ShieldCheck, Phone, Globe, Building2, DoorOpen, CalendarPlus } from "lucide-react";
import { ReserveRoomDialog } from "./ReserveRoomDialog";
import { toast } from "sonner";
import { RateUserButton } from "@/components/RateUserButton";
import { ReportUserButton } from "@/components/ReportUserDialog";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import UserFeedbackPanel from "@/components/UserFeedbackPanel";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Amenity = { idAmenity: number; amenityName: string };

type Room = {
  idRoom: number;
  roomName: string;
  capacity: number | null;
  hourlyPrice: string | number;
  notes: string | null;
  equipment: any; // jsonb flexible
};

type Api = {
  userData: {
    idUser: number;
    idUserProfile: number;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    idAddress: number | null;
    latitude: string | number | null;
    longitude: string | number | null;
    address?: {
      street?: string;
      streetNum?: number;
      city?: string;
      province?: string;
      country?: string;
      postalCode?: string;
    } | null;
  } | null;
  studio: {
    idStudio: number;
    legalName: string | null;
    phone: string | null;
    website: string | null;
    isVerified: boolean;
    openingHours: any; // jsonb
    cancellationPolicy: string | null;
  } | null;
  amenities: Amenity[];
  rooms: Room[];
  eventsAtStudio: Array<{
    idEvent: number;
    name: string;
    description: string | null;
    startsAt: string;
    endsAt: string | null;
    visibility: string;
    capacityMax: number | null;
  }>;
  eventsUpcomingCount?: number;
  eventsPastCount?: number;
};

type OpeningValue = string | string[] | null | Record<string, any>;

const DAYS_ES = [
  { key: "mon", label: "Lunes" },
  { key: "tue", label: "Martes" },
  { key: "wed", label: "Miércoles" },
  { key: "thu", label: "Jueves" },
  { key: "fri", label: "Viernes" },
  { key: "sat", label: "Sábado" },
  { key: "sun", label: "Domingo" },
];

// alias para normalizar claves que pueden venir distintas del back
const DAY_ALIASES: Record<string, "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"> = {
  mon: "mon", monday: "mon", lunes: "mon", lun: "mon",
  tue: "tue", tuesday: "tue", martes: "tue", mar: "tue",
  wed: "wed", wednesday: "wed", miercoles: "wed", miércoles: "wed", mie: "wed", mié: "wed",
  thu: "thu", thur: "thu", thurs: "thu", thursday: "thu", jueves: "thu", jue: "thu",
  fri: "fri", friday: "fri", viernes: "fri", vie: "fri",
  sat: "sat", saturday: "sat", sabado: "sat", sábado: "sat", sab: "sat",
  sun: "sun", sunday: "sun", domingo: "sun", dom: "sun",
};

function normalizeDayKey(k: string): keyof typeof DAY_ALIASES | null {
  const key = k.trim().toLowerCase();
  return (DAY_ALIASES as any)[key] ?? null;
}

function renderOpening(value: OpeningValue) {
  if (value == null || value === "") return "Cerrado";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join(" · ");
  if (typeof value === "object") return Object.values(value).join(" · ");
  return String(value);
}

function asNumber(n: string | number | null | undefined) {
  const v = typeof n === "string" ? parseFloat(n) : n;
  return Number.isFinite(v as number) ? (v as number) : null;
}

function formatPrice(value: number | string | null | undefined) {
  if (value == null) return "-";
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num)) return String(value);
  return `$${num.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} / hora`;
}

function buildFullAddress(a?: { street?: string; streetNum?: number; city?: string; province?: string; country?: string; postalCode?: string } | null) {
  if (!a) return "";
  const line1 = [a.street, a.streetNum].filter(Boolean).join(" ");
  const line2 = [a.city, a.province].filter(Boolean).join(", ");
  const line3 = a.country ? `${a.country}${a.postalCode ? ` (${a.postalCode})` : ""}` : "";
  return [line1, line2, line3].filter(Boolean).join(" · ");
}

// --- Mapa solo lectura ---
function StudioStaticMap({ lat, lng }: { lat: number; lng: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!ref.current || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const center: [number, number] = [lng, lat];
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
  }, [lat, lng]);

  return <div ref={ref} className="w-full h-[300px] rounded-2xl overflow-hidden" />;
}

export default function StudioProfile({ viewUserId }: { viewUserId?: number }) {
  const router = useRouter();
  const { user, ready } = useUser();
  const [reserveOpen, setReserveOpen] = useState(false);
  const asInt = (v: unknown) => Number.isFinite(Number(v)) ? Number(v) : NaN;
  const userMusician = user?.idUserGroup === 2;

  const params = useParams() as { idUser?: string; id?: string };
  const routeId = (params?.idUser ?? params?.id) as string | undefined;

  const [data, setData] = useState<Api | null>(null);
  const [loading, setLoading] = useState(true);
  const effectiveId = viewUserId != null ? String(viewUserId) : routeId;

  useEffect(() => {
    if (!effectiveId || Number.isNaN(Number(effectiveId))) {
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    let active = true;
    setLoading(true);

    (async () => {
      try {
        const res = await fetch(`${API_URL}/directory/studios/${effectiveId}/profile`, {
          signal: ac.signal,
          credentials: "include",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`HTTP ${res.status} - ${txt}`);
        }
        const json = await res.json();
        const payload = (json?.data ?? json) as Api;
        if (active)
          setData({
            userData: payload.userData ?? null,
            studio: payload.studio ?? null,
            amenities: payload.amenities ?? [],
            rooms: payload.rooms ?? [],
            eventsAtStudio: payload.eventsAtStudio ?? [],
            eventsUpcomingCount: payload.eventsUpcomingCount ?? 0,
            eventsPastCount: payload.eventsPastCount ?? 0,
          });
      } catch (e: any) {
        if (e?.name !== "AbortError") console.error(e);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      ac.abort();
    };
  }, [effectiveId]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 animate-pulse">
        <div className="h-32 bg-muted rounded-2xl mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-muted rounded-2xl" />
          <div className="h-64 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data || !data.userData || !data.studio) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="py-10 text-center">
            <p className="text-lg">No encontramos el perfil del estudio.</p>
            <Button className="mt-4" onClick={() => router.push(user?.idUser ? `/home/${user.idUser}` : `/home`)}>
              Volver al home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { userData, studio, amenities, rooms, eventsAtStudio } = data;
  const isOwner = ready && user?.idUser === Number(effectiveId);
  const userGroup = asInt(user?.idUserGroup);
  const canReserve = ready && !isOwner && userGroup === 2;
  console.log(canReserve, { ready, isOwner, userGroup }, user?.idUserGroup);
  const lat = asNumber(userData.latitude);
  const lng = asNumber(userData.longitude);
  const fullAddress = buildFullAddress(userData.address);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
          <AvatarEditable
            idUser={userData.idUser}
            displayName={userData.displayName}
            src={userData.avatarUrl}
            editable={isOwner}
            onUploaded={(url) => setData((prev) => (prev ? { ...prev, userData: { ...prev.userData!, avatarUrl: url } } : prev))}
          />

          {/* Info principal */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#65558F]">{userData.displayName}</h1>
              {studio.isVerified && (
                <Badge className="bg-[#65558F] text-white rounded-full inline-flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4" /> Verificado
                </Badge>
              )}
            </div>

            <div className="mt-1 text-muted-foreground text-sm md:text-base">
              {studio.legalName && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium">{studio.legalName}</span>
                </div>
              )}
              {userData.bio && <p className="mt-1 text-foreground/80">{userData.bio}</p>}
            </div>

            <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
              {fullAddress && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {fullAddress}
                </span>
              )}
              {lat != null && lng != null && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4 opacity-70" /> {lat.toFixed(3)},{lng.toFixed(3)}
                </span>
              )}
              {studio.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-4 w-4" /> {studio.phone}
                </span>
              )}
              {studio.website && (
                <a href={studio.website} target="_blank" className="inline-flex items-center gap-1 hover:underline">
                  <Globe className="h-4 w-4" /> {studio.website}
                </a>
              )}
            </div>
          </div>
          {/* Acciones */}
<div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto md:justify-end">
  {isOwner ? (
    <Button
      className="bg-[#65558F] text-white rounded-xl shadow-sm"
      variant="secondary"
      onClick={() => router.push(`/studio/${userData.idUser}/edit`)}
    >
      <DoorOpen className="mr-2 h-4 w-4" /> Editar Estudio
    </Button>
  ) : (
    <>
      {canReserve && (
        <ReserveRoomDialog
          rooms={rooms}
          openingHours={studio?.openingHours}
          onConfirm={async ({ idRoom, startsAtIso, endsAtIso, contactNumber }) => {
            const res = await fetch(`${API_URL}/booking/rooms/${idRoom}/reserve`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ startsAt: startsAtIso, endsAt: endsAtIso, contactNumber }),
            });
            if (!res.ok) {
              const txt = await res.text();
              toast.error("No se pudo completar la reserva. " + txt);
              console.error(txt);
              return;
            }
            toast.success("Reserva creada con éxito.");
            router.push(`/home/${user?.idUser}`);
          }}
        >
          <Button className="bg-[#65558F] text-white rounded-xl shadow-sm" variant="secondary">
            <CalendarPlus className="mr-2 h-4 w-4" /> Reservar Sala
          </Button>
        </ReserveRoomDialog>
      )}

      <RateUserButton targetIdUser={userData.idUser} />
      <ReportUserButton reportedIdUser={userData.idUser} />
    </>
  )}
</div>
        </CardContent>
      </Card>

      {/* Mapa (si hay coordenadas) */}
      {(lat != null && lng != null) && (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="p-6 pb-3"><CardTitle className="text-base">Ubicación</CardTitle></CardHeader>
          <CardContent className="p-6 pt-0">
            {process.env.NEXT_PUBLIC_MAPBOX_TOKEN ? (
              <StudioStaticMap lat={lat} lng={lng} />
            ) : (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                Las coordenadas están definidas, pero falta <code className="font-mono">NEXT_PUBLIC_MAPBOX_TOKEN</code> para renderizar el mapa.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <UserFeedbackPanel targetIdUser={userData.idUser} showCommentBox />

      {/* Stats rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Salas</div>
              <div className="text-2xl font-semibold text-[#65558F]">{rooms.length}</div>
            </div>
            <DoorOpen className="h-8 w-8 opacity-70" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Amenities</div>
              <div className="text-2xl font-semibold text-[#65558F]">{amenities.length}</div>
            </div>
            <Building2 className="h-8 w-8 opacity-70" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Eventos próximos</div>
              <div className="text-2xl font-semibold text-[#65558F]">{data.eventsUpcomingCount ?? 0}</div>
            </div>
            <CalendarDays className="h-8 w-8 opacity-70" />
          </CardContent>
        </Card>
      </div>

      {/* Amenities & Horarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader><CardTitle className="text-[#65558F]">Amenities</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {amenities.length ? (
              amenities.map((a) => (
                <Badge key={`amenity-${a.idAmenity}`} className="bg-[#65558F] text-white text-sm px-3 py-1 rounded-full leading-5">
                  {a.amenityName}
                </Badge>
              ))
            ) : (
              <p className="text-muted-foreground">Sin amenities cargados.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#65558F]">Horarios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {studio.openingHours ? (
              (() => {
                const map = new Map<string, OpeningValue>();
                Object.entries(studio.openingHours as Record<string, OpeningValue>).forEach(([k, v]) => {
                  const norm = normalizeDayKey(k);
                  if (norm) map.set(norm, v);
                });
                return (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {DAYS_ES.map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium">{renderOpening(map.get(key) ?? null)}</span>
                      </div>
                    ))}
                  </div>
                );
              })()
            ) : (
              <p className="text-muted-foreground">Sin horarios publicados.</p>
            )}

            {studio.cancellationPolicy && (
              <div className="pt-2">
                <div className="text-sm text-muted-foreground">Política de cancelación</div>
                <p className="mt-1">{studio.cancellationPolicy}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Salas */}
      <section>
        <h2 className="text-[#65558F] text-lg font-semibold mb-3">Salas de ensayo</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rooms.length ? (
            rooms.map((r) => (
              <Card key={`room-${r.idRoom}`} className="rounded-2xl shadow-sm transition hover:shadow-md">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{r.roomName}</h3>
                      <div className="text-sm text-muted-foreground">Capacidad: {r.capacity ?? "-"}</div>
                    </div>
                    <div className="text-right font-semibold text-[#65558F]">{formatPrice(r.hourlyPrice)}</div>
                  </div>

                  {r.notes && <p className="text-sm text-muted-foreground">{r.notes}</p>}

                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Equipamiento</div>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(r.equipment)
                        ? r.equipment.map((eq: any, idx: number) => (
                          <Badge key={`eqarr-${r.idRoom}-${idx}`} variant="outline">
                            {typeof eq === "string" ? eq : JSON.stringify(eq)}
                          </Badge>
                        ))
                        : r.equipment && typeof r.equipment === "object"
                          ? Object.entries(r.equipment).map(([k, v]) => (
                            <Badge key={`eqobj-${r.idRoom}-${k}`} variant="outline">
                              {k}: {typeof v === "string" ? v : JSON.stringify(v)}
                            </Badge>
                          ))
                          : <span className="text-sm text-muted-foreground">Sin datos</span>}
                    </div>
                  </div>

                  {isOwner && (
                    <div className="pt-2">
                      <Button size="sm" variant="secondary" className="bg-[#65558F] text-white" onClick={() => router.push(`/rooms/${r.idRoom}/edit`)}>
                        Editar sala
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="p-6 text-muted-foreground">Sin salas cargadas.</CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Eventos en el estudio (por dirección) */}
      <section>
        <h2 className="text-[#65558F] text-lg font-semibold mb-3">Eventos en el estudio</h2>
        <div className="space-y-4">
          {eventsAtStudio.length ? (
            eventsAtStudio.map((e) => (
              <Card key={`event-${e.idEvent}`} className="rounded-2xl shadow-sm transition hover:shadow-md">
                <CardContent className="p-5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-medium truncate">{e.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      <CalendarDays className="inline mr-1 h-4 w-4" />
                      {new Date(e.startsAt).toLocaleString()} {e.endsAt ? `— ${new Date(e.endsAt).toLocaleString()}` : ""}
                    </p>
                    {e.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{e.description}</p>}
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="rounded-full capitalize">{e.visibility}</Badge>
                      {e.capacityMax != null && <Badge variant="secondary" className="rounded-full">Capacidad: {e.capacityMax}</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={() => router.push(`/events/${e.idEvent}`)}>Ver</Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="p-6 text-muted-foreground">No hay eventos próximos en este estudio.</CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
