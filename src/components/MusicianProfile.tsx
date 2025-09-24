"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AvatarEditable } from "@/components/ui/AvatarEditable";
import { toast } from "sonner";
import { CalendarDays, Users, Crown, MapPin, Pencil, UserPlus, Trash2 } from "lucide-react";
import { useUser } from "@/app/context/userContext";
import EditEventDialog from "@/components/EditEventDialog";
import { RateUserButton } from "@/components/RateUserButton";
import { ReportUserButton } from "@/components/ReportUserDialog";
import UserFeedbackPanel from "@/components/UserFeedbackPanel";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// ---- Tipos ----
export type Api = {
  userData: {
    idUser: number;
    idUserProfile: number;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  musician: {
    idMusician: number;
    experienceYears: number | null;
    skillLevel: string;
    isAvailable: boolean;
    travelRadiusKm: number | null;
    visibility: string;
    birthDate: string | null;
    instruments: { idInstrument: number; instrumentName: string; isPrimary: boolean }[];
    genres: { idGenre: number; genreName: string }[];
  } | null;
  bands: Array<{
    idBand: number;
    name: string;
    description: string | null;
    roleInBand: string | null;
    isAdmin: boolean;
    joinedAt: Date | null;
    leftAt: Date | null;
    membersCount: number;
    genres: { idGenre: number; genreName: string }[];
  }>;
  eventsCreated: Array<{
    idEvent: number;
    name: string;
    description: string | null;
    startsAt: string;
    endsAt: string | null;
    visibility: string;
    capacityMax: number | null;
  }>;
};

export default function MusicianProfile({ viewUserId }: { viewUserId?: number }) {
  const router = useRouter();
  const [data, setData] = useState<Api | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, ready } = useUser();
  const params = useParams() as { idUser?: string; id?: string };
  const routeId = (params?.idUser ?? params?.id) as string | undefined;
  const effectiveId = viewUserId != null ? String(viewUserId) : routeId;
  const [deletingBandId, setDeletingBandId] = useState<number | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<number | null>(null);

  // ---- Carga de datos ----
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
        const res = await fetch(`${API_URL}/directory/${effectiveId}/profile`, {
          signal: ac.signal,
          headers: { Accept: "application/json" },
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`HTTP ${res.status} - ${txt}`);
        }
        const json = await res.json();
        const payload = (json?.data ?? json) as any;
        if (active)
          setData({
            ...payload,
            userData: payload.user ?? payload.userData ?? null,
          });
      } catch (e: any) {
        if (e?.name === "AbortError" || e?.message?.includes("aborted")) return;
        console.error(e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      ac.abort();
    };
  }, [effectiveId]);

  // ---- Acciones ----
  async function handleDeleteBand(idBand: number, bandName?: string) {
    if (!Number.isFinite(idBand)) return;
    const ok = window.confirm(
      `¿Seguro que querés eliminar la banda${bandName ? ` “${bandName}”` : ""}? Esta acción es permanente.`
    );
    if (!ok) return;

    try {
      setDeletingBandId(idBand);
      const res = await fetch(`${API_URL}/bands/${idBand}`, {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      let json: any = {};
      try {
        json = await res.json();
      } catch {}
      if (!res.ok || json?.ok === false) {
        if (res.status === 403) throw new Error("No sos admin de esta banda.");
        if (res.status === 404) throw new Error("La banda no existe.");
        throw new Error(json?.error ?? `HTTP ${res.status}`);
      }
      setData((prev) => (prev ? { ...prev, bands: prev.bands.filter((b) => b.idBand !== idBand) } : prev));
      toast.success("Banda eliminada");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "No se pudo eliminar la banda");
    } finally {
      setDeletingBandId(null);
    }
  }

  async function handleDeleteEvent(idEvent: number) {
    if (!Number.isFinite(idEvent)) return;
    const ok = window.confirm(`¿Seguro que querés eliminar el evento? Esta acción es permanente.`);
    if (!ok) return;
    try {
      setDeletingEventId(idEvent);
      const res = await fetch(`${API_URL}/events/${idEvent}`, {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      let json: any = {};
      try {
        json = await res.json();
      } catch {}
      if (!res.ok || json?.ok === false) {
        if (res.status === 403) throw new Error("No sos admin de este evento.");
        if (res.status === 404) throw new Error("El evento no existe");
        throw new Error(json?.error ?? `HTTP ${res.status}`);
      }
      setData((prev) => (prev ? { ...prev, eventsCreated: prev.eventsCreated.filter((e) => e.idEvent !== idEvent) } : prev));
      toast.success("Evento eliminado");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "No se pudo eliminar el evento");
    } finally {
      setDeletingEventId(null);
    }
  }

  async function handleSendRequest(targetId: number) {
    const res = await fetch(`${API_URL}/network/connections/${targetId}`, {
      method: "POST",
      credentials: "include",
    });
    const json = await res.json();
    if (json.ok) {
      toast.success(json.data?.info ?? "Solicitud enviada");
    } else {
      toast.error(json.error ?? "No se pudo enviar la solicitud");
    }
  }

  // ---- Render ----
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 animate-pulse">
        <div className="h-36 bg-muted rounded-2xl mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-muted rounded-2xl" />
          <div className="h-64 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data || !data.userData) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="py-10 text-center">
            <p className="text-lg">No encontramos el perfil.</p>
            <Button className="mt-4" onClick={() => router.push(`/home/${user?.idUser ?? ""}`)}>
              Volver al home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { userData, musician, bands, eventsCreated } = data;
  const isOwner = ready && user?.idUser === Number(effectiveId);
  const toNum = (v: unknown) => (v === null || v === undefined ? NaN : Number(v));

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
            onUploaded={(url) =>
              setData((prev) => (prev ? { ...prev, userData: { ...prev.userData!, avatarUrl: url } } : prev))
            }
          />

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#65558F]">
                {userData.displayName}
              </h1>
              {musician?.isAvailable && (
                <Badge className="bg-[#65558F] text-white rounded-full">Disponible</Badge>
              )}
            </div>
            {userData.bio && <p className="text-muted-foreground mt-1 text-balance">{userData.bio}</p>}

            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-sm text-muted-foreground">
              {musician?.experienceYears != null && <span>{musician.experienceYears} años de experiencia</span>}
              {musician && <span>Nivel: {musician.skillLevel}</span>}
              {musician?.travelRadiusKm != null && <span>Radio: {musician.travelRadiusKm} km</span>}
              {userData.latitude != null && userData.longitude != null && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={16} /> {toNum(userData.latitude).toFixed(3)},{toNum(userData.longitude).toFixed(3)}
                </span>
              )}
            </div>
          </div>

          {/* Action bar */}
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto md:justify-end">

            {isOwner ? (
              <Button
                className="bg-[#65558F] text-white rounded-xl shadow-sm"
                variant="secondary"
                onClick={() => router.push(`/profile/${userData.idUser}/edit`)}
              >
                <Pencil className="mr-2 h-4 w-4" /> Editar Perfil
              </Button>
            ) : (
              <>
                <Button
                  className="bg-[#65558F] text-white rounded-xl shadow-sm"
                  variant="secondary"
                  onClick={() => handleSendRequest(Number(effectiveId))}
                >
                  <UserPlus size={18} className="mr-1" /> Conectar
                </Button>
                <RateUserButton targetIdUser={userData.idUser} />
                {/* Mostrar Reportar solo si no es su propio perfil */}
                <ReportUserButton reportedIdUser={userData.idUser} />
              </>
            )}
          </div>
        </CardContent>
      </Card>
    <UserFeedbackPanel targetIdUser={userData.idUser} showCommentBox />

      {/* Instruments & Genres */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#65558F]">Instrumentos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {musician?.instruments?.length ? (
              musician.instruments.map((i) => (
                <Badge
                  key={`inst-${i.idInstrument}`}
                  variant={i.isPrimary ? "default" : "secondary"}
                  className={
                    i.isPrimary
                      ? "bg-[#65558F] text-white text-sm px-3 py-1 rounded-full"
                      : "text-sm px-3 py-1 rounded-full"
                  }
                >
                  {i.instrumentName}
                  {i.isPrimary ? " · Principal" : ""}
                </Badge>
              ))
            ) : (
              <p className="text-muted-foreground">Sin instrumentos cargados.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#65558F]">Géneros</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {musician?.genres?.length ? (
              musician.genres.map((g) => (
                <Badge key={`genre-${g.idGenre}`} variant="outline" className="rounded-full">
                  {g.genreName}
                </Badge>
              ))
            ) : (
              <p className="text-muted-foreground">Sin géneros cargados.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* My Bands */}
      <section>
        <h2 className="text-[#65558F] text-lg font-semibold mb-3">Mis Bandas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bands.length ? (
            bands.map((b) => (
              <Card key={`band-${b.idBand}`} className="rounded-2xl shadow-sm transition hover:shadow-md">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-medium truncate">{b.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {b.description ?? "Sin descripción"}
                      </p>
                    </div>
                    <div className="text-right space-y-2 shrink-0">
                      <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                        <Users size={16} /> {b.membersCount}
                      </div>
                      {b.isAdmin && (
                        <Badge className="inline-flex items-center gap-1 rounded-full">
                          <Crown size={14} /> Admin
                        </Badge>
                      )}
                    </div>
                  </div>

                  {b.genres?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {b.genres.map((g) => (
                        <Badge key={`band-${b.idBand}-genre-${g.idGenre}`} variant="outline" className="rounded-full">
                          {g.genreName}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {b.roleInBand && (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="rounded-full">
                        Rol: {b.roleInBand}
                      </Badge>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button size="sm" onClick={() => router.push(`/bands/${b.idBand}`)}>
                      Ver más
                    </Button>

                    {isOwner && (
                      b.isAdmin ? (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => router.push(`/bands/${b.idBand}/manage`)}>
                            Administrar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteBand(b.idBand, b.name)}
                            disabled={deletingBandId === b.idBand}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {deletingBandId === b.idBand ? "Eliminando..." : "Eliminar"}
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => router.push(`/bands/${b.idBand}/leave`)}>
                          Salir de la banda
                        </Button>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="p-6 text-muted-foreground">Aún no integras ninguna banda.</CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* My Events */}
      <section>
        <h2 className="text-[#65558F] text-lg font-semibold mb-3">Mis Eventos</h2>
        <div className="space-y-4">
          {eventsCreated.length ? (
            eventsCreated.map((e) => (
              <Card key={`event-${e.idEvent}`} className="rounded-2xl shadow-sm transition hover:shadow-md">
                <CardContent className="p-5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-medium truncate">{e.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      <CalendarDays className="inline mr-1 h-4 w-4" />
                      {new Date(e.startsAt).toLocaleString()} {e.endsAt ? `— ${new Date(e.endsAt).toLocaleString()}` : ""}
                    </p>
                    {e.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{e.description}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="rounded-full capitalize">{e.visibility}</Badge>
                      {e.capacityMax != null && (
                        <Badge variant="secondary" className="rounded-full">Capacidad: {e.capacityMax}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={() => router.push(`/events/${e.idEvent}`)}>
                      Ver
                    </Button>
                    {isOwner && (
                      <EditEventDialog
                        eventId={e.idEvent}
                        onUpdated={(updated) => {
                          console.log("Evento actualizado", updated);
                        }}
                        trigger={<Button variant="outline">Editar</Button>}
                      />
                    )}
                    {isOwner && (
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteEvent(e.idEvent)} disabled={deletingEventId === e.idEvent}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        {deletingEventId === e.idEvent ? "Eliminando..." : "Eliminar"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="p-6 text-muted-foreground">No tienes eventos creados.</CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
