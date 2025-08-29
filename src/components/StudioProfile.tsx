"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/app/context/userContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AvatarEditable } from "@/components/ui/AvatarEditable";
import { CalendarDays, MapPin, ShieldCheck, Phone, Globe, Building2, DoorOpen } from "lucide-react";

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

function buildFullAddress(a?: {
  street?: string; streetNum?: number; city?: string; province?: string; country?: string; postalCode?: string;
} | null) {
  if (!a) return "";
  const line1 = [a.street, a.streetNum].filter(Boolean).join(" ");
  const line2 = [a.city, a.province].filter(Boolean).join(", ");
  const line3 = a.country ? `${a.country}${a.postalCode ? ` (${a.postalCode})` : ""}` : "";
  return [line1, line2, line3].filter(Boolean).join(" · ");
}

export default function StudioProfile({ viewUserId }: { viewUserId?: number }) {
  const router = useRouter();
  const { user, ready } = useUser();

  const params = useParams() as { idUser?: string; id?: string };
  const routeId = (params?.idUser ?? params?.id) as string | undefined;

  const [data, setData] = useState<Api | null>(null);
  const [loading, setLoading] = useState(true);
   const effectiveId = viewUserId != null ? String(viewUserId) : routeId;

  useEffect(() => {
    if (!effectiveId  || Number.isNaN(Number(effectiveId ))) {
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    let active = true;
    setLoading(true);

    (async () => {
      try {
        // Perfil de estudio por id de usuario (dueño del estudio)
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

        if (active) setData({
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
        <Card className="rounded-2xl shadow">
          <CardContent className="py-10 text-center">
            <p className="text-lg">No encontramos el perfil del estudio.</p>
            <Button
              className="mt-4"
              onClick={() => router.push(user?.idUser ? `/home/${user.idUser}` : `/home`)}
            >
              Volver al home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { userData, studio, amenities, rooms, eventsAtStudio } = data;
  const isOwner = ready && user?.idUser === Number(effectiveId);

  const lat = asNumber(userData.latitude);
  const lng = asNumber(userData.longitude);

const fullAddress = buildFullAddress(userData.address);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <Card className="rounded-2xl">
        <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
          <AvatarEditable
            idUser={userData.idUser}
            displayName={userData.displayName}
            src={userData.avatarUrl}
            editable={isOwner}
            onUploaded={(url) =>
              setData(prev =>
                prev ? { ...prev, userData: { ...prev.userData!, avatarUrl: url } } : prev
              )
            }
          />

          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-[#65558F] text-2xl font-semibold">{userData.displayName}</h1>
              {studio.isVerified && (
                <Badge className="bg-[#65558F] text-white rounded-full inline-flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4" /> Verificado
                </Badge>
              )}
            </div>

            <div className="mt-1 text-muted-foreground">
              {studio.legalName && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium">{studio.legalName}</span>
                </div>
              )}
              {userData.bio && <p className="mt-1">{userData.bio}</p>}
            </div>

            <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
              {fullAddress && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {fullAddress}
                </span>
              )}
              {lat != null && lng != null && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4 opacity-70" />
                  {lat.toFixed(3)},{lng.toFixed(3)}
                </span>
              )}
              {studio.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-4 w-4" /> {studio.phone}
                </span>
              )}
              {studio.website && (
                <a href={studio.website} target="_blank" className="inline-flex items-center gap-1 hover:underline">
                  <Globe className="h-4 w-4" /> Sitio web
                </a>
              )}
            </div>
          </div>

          {isOwner && (
            <div className="flex gap-2">
              <Button
                className="bg-[#65558F] text-white"
                variant="secondary"
                onClick={() => router.push(`/studios/${userData.idUser}/edit`)}
              >
                <DoorOpen className="mr-2 h-4 w-4" />
                Editar Estudio
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Salas</div>
              <div className="text-2xl font-semibold text-[#65558F]">{rooms.length}</div>
            </div>
            <DoorOpen className="h-8 w-8 opacity-70" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Amenities</div>
              <div className="text-2xl font-semibold text-[#65558F]">{amenities.length}</div>
            </div>
            <Building2 className="h-8 w-8 opacity-70" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
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
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-[#65558F]">Amenities</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {amenities.length ? (
              amenities.map(a => (
                <Badge
                  key={`amenity-${a.idAmenity}`}
                  className="bg-[#65558F] text-white text-sm px-3 py-1 rounded-full leading-5"
                >
                  {a.amenityName}
                </Badge>
              ))
            ) : (
              <p className="text-muted-foreground">Sin amenities cargados.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-[#65558F]">Horarios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {studio.openingHours ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {Object.entries(studio.openingHours).map(([day, value]) => (
                  <div key={day} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{day}</span>
                    <span className="font-medium">
                      {typeof value === "string"
                        ? value
                        : Array.isArray(value)
                        ? value.join(" · ")
                        : JSON.stringify(value)}
                    </span>
                  </div>
                ))}
              </div>
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
              <Card key={`room-${r.idRoom}`} className="rounded-2xl">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{r.roomName}</h3>
                      <div className="text-sm text-muted-foreground">
                        Capacidad: {r.capacity ?? "-"}
                      </div>
                    </div>
                    <div className="text-right font-semibold text-[#65558F]">
                      {formatPrice(r.hourlyPrice)}
                    </div>
                  </div>

                  {r.notes && (
                    <p className="text-sm text-muted-foreground">{r.notes}</p>
                  )}

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
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-[#65558F] text-white"
                        onClick={() => router.push(`/studios/${userData.idUser}/rooms/${r.idRoom}/edit`)}
                      >
                        Editar sala
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="rounded-2xl">
              <CardContent className="p-6 text-muted-foreground">
                Sin salas cargadas.
              </CardContent>
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
              <Card key={`event-${e.idEvent}`} className="rounded-2xl">
                <CardContent className="p-5 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium">{e.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      <CalendarDays className="inline mr-1 h-4 w-4" />
                      {new Date(e.startsAt).toLocaleString()}{" "}
                      {e.endsAt ? `— ${new Date(e.endsAt).toLocaleString()}` : ""}
                    </p>
                    {e.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {e.description}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{e.visibility}</Badge>
                      {e.capacityMax != null && (
                        <Badge variant="secondary">Capacidad: {e.capacityMax}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={() => router.push(`/events/${e.idEvent}`)}>
                      Ver
                    </Button>
                    {/* No mostramos 'Editar' acá; solo el creador del evento debería */}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="rounded-2xl">
              <CardContent className="p-6 text-muted-foreground">
                No hay eventos próximos en este estudio.
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
